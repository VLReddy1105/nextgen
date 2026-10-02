from app.schemas.ecosystem import OpportunityEdit
from typing import Literal
from uuid import UUID
from fastapi import APIRouter, Query
from app.api.dependencies import Student, Current
from app.schemas.actions import Toggle
from app.services.catalog import catalog, one

router = APIRouter(prefix="/api/v1/opportunities", tags=["opportunities"])


@router.get("")
async def listing(
    current: Student,
    q: str = Query("", max_length=160),
    type: Literal[
        "", "job", "internship", "project", "competition", "hiring_drive"
    ] = "",
    skill: str = Query("", max_length=80),
    location: str = Query("", max_length=160),
    work_mode: Literal["", "remote", "hybrid", "on-site"] = "",
    experience: Literal["", "fresher", "0-1", "1-2", "2+"] = "",
    sort: Literal["recommended", "newest", "closing"] = "recommended",
    page: int = Query(1, ge=1),
    limit: int = Query(30, ge=1, le=100),
):
    rows = await catalog(current, "opportunities")
    rows = [
        r
        for r in rows
        if (
            not q
            or q.casefold()
            in (
                r["title"] + " " + r["description"] + " " + r["organization"]
            ).casefold()
        )
        and (not type or r["type"] == type)
        and (not skill or skill.casefold() in [s.casefold() for s in r["tags"]])
        and (not location or location.casefold() in r["location"].casefold())
        and (not work_mode or r["work_mode"] == work_mode)
        and (not experience or r["experience"] == experience)
    ]
    if sort != "recommended":
        rows.sort(
            key=lambda r: r["created_at"] if sort == "newest" else r["deadline"],
            reverse=sort == "newest",
        )
    return {"items": rows[(page - 1) * limit : page * limit], "total": len(rows)}


@router.get("/{id}")
async def detail(id: UUID, current: Current):
    record = await one(current.repo, "opportunities", id)
    record["applied"] = bool(
        await current.repo.rows(
            "applications", student_id=f"eq.{current.id}", opportunity_id=f"eq.{id}"
        )
    )
    record["saved"] = bool(
        await current.repo.rows(
            "saved_opportunities", user_id=f"eq.{current.id}", opportunity_id=f"eq.{id}"
        )
    )
    return record


@router.post("")
async def publish(body: OpportunityEdit, current: Current):
    return {
        "id": await current.repo.rpc(
            "eco_opportunity_save",
            {"p_data": body.model_dump(mode="json"), "p_id": None},
        )
    }


@router.put("/{id}/saved")
async def save(id: UUID, body: Toggle, current: Student):
    await current.repo.rpc("workspace_save", {"p_id": str(id), "p_saved": body.enabled})
    return {"ok": True}


@router.post("/{id}/applications", status_code=201)
async def apply(id: UUID, current: Student):
    return {"id": await current.repo.rpc("workspace_apply", {"p_id": str(id)})}


@router.patch("/{id}")
async def edit(id: UUID, body: OpportunityEdit, current: Current):
    return {
        "id": await current.repo.rpc(
            "eco_opportunity_save",
            {"p_data": body.model_dump(mode="json"), "p_id": str(id)},
        )
    }
