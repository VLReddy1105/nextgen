from uuid import UUID
from fastapi import APIRouter
from app.api.dependencies import Student, Current
from app.schemas.actions import ApplicationStatus
from app.services.catalog import applications, one
from app.core.errors import require
from app.services.concurrency import gather

router = APIRouter(prefix="/api/v1/applications", tags=["applications"])


@router.get("")
async def listing(current: Current):
    require(current.role in ("student", "company", "founder", "university"))
    return {"items": await applications(current)}


@router.get("/{id}")
async def detail(id: UUID, current: Current):
    record = await one(current.repo, "applications", id)
    posting = await one(current.repo, "opportunities", record["opportunity_id"])
    record["title"] = posting["title"]
    record["can_manage"] = posting["created_by"] == current.id
    organization, applicant, history = await gather(
        one(current.repo, "organizations", posting["organization_id"]),
        current.repo.rpc("eco_applicant_summary", {"p_id": str(id)}),
        current.repo.rows("application_history", application_id=f"eq.{id}", order="created_at.asc"),
    )
    record["organization"] = organization["name"]
    record["applicant"] = applicant
    record["history"] = history
    return record


@router.patch("/{id}/status")
async def status(id: UUID, body: ApplicationStatus, current: Current):
    await current.repo.rpc(
        "workspace_application_status",
        {
            "p_id": str(id),
            "p_status": body.status,
            "p_note": body.note,
            "p_interview_at": (
                body.interview_at.isoformat() if body.interview_at else None
            ),
        },
    )
    return {"ok": True}
