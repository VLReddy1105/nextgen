import hashlib
import secrets
from uuid import UUID
from typing import Literal
from fastapi import APIRouter
from app.api.dependencies import Current, Student
from app.schemas.ecosystem import (
    Decision,
    SpaceEdit,
    SpaceInvite,
    CodeCreate,
    CodeToken,
    TaskEdit,
)
from app.schemas.actions import Toggle

router = APIRouter(prefix="/api/v1", tags=["relationships"])
Kind = Literal["projects", "communities"]


@router.post("/relationships/{kind}")
async def create(kind: Kind, body: SpaceEdit, current: Current):
    return {
        "id": await current.repo.rpc(
            "eco_space_save", {"p_kind": kind, "p_data": body.model_dump(mode="json")}
        )
    }


@router.patch("/relationships/{kind}/{id}")
async def edit(kind: Kind, id: UUID, body: SpaceEdit, current: Current):
    return {
        "id": await current.repo.rpc(
            "eco_space_save",
            {"p_kind": kind, "p_id": str(id), "p_data": body.model_dump(mode="json")},
        )
    }


@router.post("/relationships/{kind}/{id}/invitations")
async def invite(kind: Kind, id: UUID, body: SpaceInvite, current: Current):
    return {
        "id": await current.repo.rpc(
            "eco_invite",
            {
                "p_kind": kind,
                "p_id": str(id),
                "p_email": body.email,
                "p_role": body.requested_role,
            },
        )
    }


@router.post("/invitations/{id}/decision")
async def decide(id: UUID, body: Decision, current: Current):
    await current.repo.rpc(
        "eco_invitation_decide", {"p_id": str(id), "p_accept": body.accept}
    )
    return {"ok": True}


@router.post("/relationships/{kind}/{id}/requests")
async def request(kind: Kind, id: UUID, current: Current):
    return {
        "id": await current.repo.rpc(
            "eco_join_request", {"p_kind": kind, "p_id": str(id)}
        )
    }


@router.post("/join-requests/{id}/decision")
async def request_decide(id: UUID, body: Decision, current: Current):
    await current.repo.rpc(
        "eco_request_decide", {"p_id": str(id), "p_accept": body.accept}
    )
    return {"ok": True}


@router.delete("/relationships/{kind}/{id}/members/{user}")
async def remove(kind: Kind, id: UUID, user: UUID, current: Current):
    await current.repo.rpc(
        "eco_member_remove", {"p_kind": kind, "p_id": str(id), "p_user": str(user)}
    )
    return {"ok": True}


@router.post("/projects/{id}/codes")
async def create_code(id: UUID, body: CodeCreate, current: Current):
    token = "GZ-PROJ-" + secrets.token_urlsafe(32)
    record = await current.repo.rpc(
        "eco_code_create",
        {
            "p_id": str(id),
            "p_hash": hashlib.sha256(token.encode()).hexdigest(),
            "p_days": body.days,
            "p_limit": body.usage_limit,
        },
    )
    return {"id": record, "token": token}


@router.delete("/project-codes/{id}")
async def revoke_code(id: UUID, current: Current):
    await current.repo.rpc("eco_code_revoke", {"p_id": str(id)})
    return {"ok": True}


@router.post("/project-codes/preview")
async def preview(body: CodeToken, current: Student):
    return await current.repo.rpc("eco_code_preview", {"p_token": body.token})


@router.post("/project-codes/accept")
async def accept(body: CodeToken, current: Student):
    return {"id": await current.repo.rpc("eco_code_accept", {"p_token": body.token})}


@router.post("/projects/{id}/tasks")
async def create_task(id: UUID, body: TaskEdit, current: Current):
    return {
        "id": await current.repo.rpc(
            "eco_task_save",
            {"p_project": str(id), "p_data": body.model_dump(mode="json")},
        )
    }


@router.patch("/projects/{id}/tasks/{task}")
async def edit_task(id: UUID, task: UUID, body: TaskEdit, current: Current):
    return {
        "id": await current.repo.rpc(
            "eco_task_save",
            {
                "p_project": str(id),
                "p_id": str(task),
                "p_data": body.model_dump(mode="json"),
            },
        )
    }


@router.put("/projects/{id}/portfolio")
async def portfolio(id: UUID, body: Toggle, current: Student):
    await current.repo.rpc(
        "eco_portfolio", {"p_project": str(id), "p_show": body.enabled}
    )
    return {"ok": True}


@router.delete("/invitations/{id}")
async def cancel_invitation(id: UUID, current: Current):
    await current.repo.rpc("eco_invitation_cancel", {"p_id": str(id)})
    return {"ok": True}
