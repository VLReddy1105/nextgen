from fastapi import APIRouter
from app.api.dependencies import Student
from app.schemas.student import ProfileUpdate
from app.services.students import student_core
from fastapi import UploadFile, File
from fastapi.responses import Response
from app.core.errors import APIError
from uuid import uuid4
import httpx

router = APIRouter(prefix="/api/v1/students", tags=["students"])


@router.get("/me")
async def me(current: Student):
    return await student_core(current)


@router.patch("/me")
async def update(body: ProfileUpdate, current: Student):
    await current.repo.rpc(
        "update_student_workspace_profile", {"p_data": body.model_dump()}
    )
    current.profile.update(full_name=body.full_name, headline=body.headline)
    return await student_core(current)


@router.get("/me/universities")
async def universities(current: Student):
    profile = await student_core(current)
    ids = profile["university_ids"]
    organizations = (
        await current.repo.rows("organizations", id="in.(" + ",".join(ids) + ")")
        if ids
        else []
    )
    return {"memberships": profile["memberships"], "organizations": organizations}


@router.post("/me/resume")
async def resume(current: Student, file: UploadFile = File(...)):
    existing = await current.repo.rows("student_details", profile_id=f"eq.{current.id}")
    if not existing:
        raise APIError("PROFILE_REQUIRED", "Save your profile before uploading.", 409)
    content = await file.read(5 * 1024 * 1024 + 1)
    if (
        len(content) > 5 * 1024 * 1024
        or not content.startswith(b"%PDF-")
        or file.content_type != "application/pdf"
    ):
        raise APIError("INVALID_FILE", "Choose a PDF up to 5 MB.", 422)
    path = f"{current.id}/{uuid4()}.pdf"
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            current.repo.url + "/storage/v1/object/student-resumes/" + path,
            headers={**current.repo.headers, "Content-Type": "application/pdf"},
            content=content,
        )
    if response.is_error:
        raise APIError(
            "UPLOAD_FAILED",
            "Resume storage is unavailable. Check that the private storage migration is installed.",
            503,
        )
    try:
        result = await current.repo.update(
            "student_details", {"resume_path": path}, profile_id=f"eq.{current.id}"
        )
        if not result:
            raise APIError(
                "PROFILE_REQUIRED", "Complete your profile before uploading.", 409
            )
    except Exception:
        async with httpx.AsyncClient(timeout=15) as client:
            await client.delete(
                current.repo.url + "/storage/v1/object/student-resumes/" + path,
                headers=current.repo.headers,
            )
        raise
    return {"ok": True}


@router.get("/me/resume")
async def download_resume(current: Student):
    profile = await student_core(current)
    path = profile.get("resume_path")
    if not path or not path.startswith(current.id + "/"):
        raise APIError("NOT_FOUND", "No resume uploaded.", 404)
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.get(
            current.repo.url
            + "/storage/v1/object/authenticated/student-resumes/"
            + path,
            headers=current.repo.headers,
        )
    if response.is_error:
        raise APIError("DOWNLOAD_FAILED", "Resume could not be downloaded.", 503)
    return Response(
        response.content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="resume.pdf"',
            "Cache-Control": "no-store",
        },
    )


@router.get("/me/portfolio")
async def portfolio(current: Student):
    return {
        "items": await current.repo.rpc(
            "eco_portfolio_projects", {"p_student": current.id}
        )
    }
