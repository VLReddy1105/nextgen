from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter
from app.api.dependencies import Current
from app.core.errors import APIError

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("")
async def listing(current: Current):
    rows = await current.repo.rows(
        "notifications", recipient_user_id=f"eq.{current.id}", order="created_at.desc"
    )
    return {"items": rows, "unread": sum(r["read_at"] is None for r in rows)}


@router.patch("/{id}/read")
async def read(id: UUID, current: Current):
    result = await current.repo.update(
        "notifications",
        {"read_at": datetime.now(timezone.utc).isoformat()},
        id=f"eq.{id}",
        recipient_user_id=f"eq.{current.id}",
    )
    if not result:
        raise APIError("NOT_FOUND", "Notification unavailable.", 404)
    return {"ok": True}


@router.post("/read-all")
async def read_all(current: Current):
    await current.repo.update(
        "notifications",
        {"read_at": datetime.now(timezone.utc).isoformat()},
        recipient_user_id=f"eq.{current.id}",
        read_at="is.null",
    )
    return {"ok": True}
