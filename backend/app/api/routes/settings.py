from fastapi import APIRouter
from app.api.dependencies import Current
from app.schemas.actions import Preferences, Report

router = APIRouter(prefix="/api/v1", tags=["settings"])


@router.get("/settings")
async def get_settings(current: Current):
    rows = await current.repo.rows("student_preferences", user_id=f"eq.{current.id}")
    return rows[0] if rows else Preferences().model_dump()


@router.put("/settings")
async def update(body: Preferences, current: Current):
    rows = await current.repo.rows("student_preferences", user_id=f"eq.{current.id}")
    if rows:
        await current.repo.update(
            "student_preferences", body.model_dump(), user_id=f"eq.{current.id}"
        )
    else:
        await current.repo.insert(
            "student_preferences", {"user_id": current.id, **body.model_dump()}
        )
    return body


@router.post("/support/reports", status_code=201)
async def report(body: Report, current: Current):
    return await current.repo.insert(
        "support_reports", {"user_id": current.id, **body.model_dump()}
    )
