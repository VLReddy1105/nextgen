from app.schemas.ecosystem import EventEdit
from uuid import UUID
from fastapi import APIRouter
from app.api.dependencies import Student, Current
from app.schemas.actions import Toggle
from app.services.catalog import catalog, one

router = APIRouter(prefix="/api/v1/events", tags=["events"])


@router.get("")
async def listing(current: Student):
    return {"items": await catalog(current, "events")}


@router.get("/{id}")
async def detail(id: UUID, current: Current):
    record = await one(current.repo, "events", id)
    record["member_count"] = (
        len(await current.repo.rows("event_registrations", event_id=f"eq.{id}"))
        if record["organizer_id"] == current.id
        else None
    )
    record["registered"] = bool(
        await current.repo.rows(
            "event_registrations", user_id=f"eq.{current.id}", event_id=f"eq.{id}"
        )
    )
    return record


@router.post("")
async def publish(body: EventEdit, current: Current):
    return {
        "id": await current.repo.rpc(
            "eco_event_save",
            {"p_data": body.model_dump(mode="json"), "p_id": None},
        )
    }


@router.put("/{id}/registration")
async def register(id: UUID, body: Toggle, current: Student):
    await current.repo.rpc(
        "workspace_register", {"p_id": str(id), "p_registered": body.enabled}
    )
    return {"ok": True}


@router.patch("/{id}")
async def edit(id: UUID, body: EventEdit, current: Current):
    return {
        "id": await current.repo.rpc(
            "eco_event_save", {"p_data": body.model_dump(mode="json"), "p_id": str(id)}
        )
    }
