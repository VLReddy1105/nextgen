from uuid import UUID
from fastapi import APIRouter
from app.api.dependencies import Student
from app.services.catalog import catalog
from app.core.errors import APIError

router = APIRouter(prefix="/api/v1/mentorship", tags=["mentorship"])


@router.get("")
async def listing(current: Student):
    return {
        "items": await catalog(current, "mentorship"),
        "connections": await current.repo.rows(
            "mentor_connections", student_id=f"eq.{current.id}"
        ),
        "sessions": await current.repo.rows(
            "mentor_sessions", student_id=f"eq.{current.id}"
        ),
    }


@router.get("/{id}")
async def detail(id: UUID, current: Student):
    rows = await catalog(current, "mentorship")
    for row in rows:
        if row["id"] == str(id):
            return row
    raise APIError("NOT_FOUND", "Mentor unavailable.", 404)
