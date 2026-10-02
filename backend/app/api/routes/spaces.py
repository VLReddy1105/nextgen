from typing import Literal
from uuid import UUID
from fastapi import APIRouter
from app.api.dependencies import Student, Current
from app.schemas.actions import Invite, TaskStatus, Post, Toggle, Resource, Space
from app.services.catalog import catalog, one
from app.core.errors import require

router = APIRouter(prefix="/api/v1", tags=["spaces"])
Kind = Literal["projects", "communities"]


@router.post("/resources/{kind}/{id}")
async def resource(
    kind: Literal["task", "file", "resource"],
    id: UUID,
    body: Resource,
    current: Current,
):
    require(kind == "task" or bool(body.url), "An HTTPS resource URL is required.")
    return {
        "id": await current.repo.rpc(
            "workspace_resource",
            {"p_kind": kind, "p_id": str(id), "p_data": body.model_dump(mode="json")},
        )
    }


@router.get("/spaces/{kind}")
async def listing(kind: Kind, current: Current):
    return {"items": await catalog(current, kind)}


@router.post("/spaces/{kind}")
async def create(kind: Kind, body: Space, current: Current):
    return {
        "id": await current.repo.rpc(
            "workspace_create", {"p_kind": kind, "p_data": body.model_dump()}
        )
    }


@router.get("/spaces/{kind}/{id}")
async def detail(kind: Kind, id: UUID, current: Current):
    record = await one(current.repo, kind, id)
    record["organization_id"] = (
        record.get("organization_id")
        or record.get("university_id")
        or record.get("company_id")
    )
    field = "project_id" if kind == "projects" else "community_id"
    memberships = await current.repo.rows(
        "project_members" if kind == "projects" else "community_members",
        **{field: f"eq.{id}", "user_id": f"eq.{current.id}", "status": "eq.active"},
    )
    record["joined"] = bool(memberships)
    record["my_role"] = memberships[0]["role"] if memberships else None
    record.update(
        await current.repo.rpc(
            "eco_relationship_directory", {"p_kind": kind, "p_id": str(id)}
        )
    )
    if kind == "projects" and record["my_role"] == "project_head":
        record["codes"] = await current.repo.rows(
            "project_invite_codes",
            project_id=f"eq.{id}",
            select="id,expires_at,revoked_at,uses,usage_limit,created_at",
        )
    if record["joined"]:
        record["team"] = await current.repo.rpc(
            "workspace_directory", {"p_kind": kind, "p_id": str(id)}
        )
        if kind == "projects":
            for name, table in [
                ("tasks", "project_tasks"),
                ("files", "project_files"),
                ("activity", "project_activity"),
            ]:
                record[name] = await current.repo.rows(table, project_id=f"eq.{id}")
        else:
            record["posts"] = await current.repo.rows(
                "community_posts", community_id=f"eq.{id}", order="created_at.desc"
            )
            ids = ",".join(p["id"] for p in record["posts"])
            record["comments"] = (
                await current.repo.rows(
                    "community_comments", post_id=f"in.({ids})", order="created_at.asc"
                )
                if ids
                else []
            )
            record["reactions"] = (
                await current.repo.rows("community_reactions", post_id=f"in.({ids})")
                if ids
                else []
            )
            record["resources"] = await current.repo.rows(
                "community_resources", community_id=f"eq.{id}"
            )
            record["events"] = await current.repo.rows(
                "events", community_id=f"eq.{id}"
            )
            record["projects"] = await current.repo.rows(
                "projects", community_id=f"eq.{id}"
            )
    return record


@router.post("/spaces/{kind}/{id}/join")
async def join(kind: Kind, id: UUID, current: Current):
    await current.repo.rpc("workspace_join", {"p_kind": kind, "p_id": str(id)})
    return {"ok": True}


@router.post("/spaces/{kind}/{id}/invitations")
async def invite(kind: Kind, id: UUID, body: Invite, current: Current):
    await current.repo.rpc(
        "workspace_invite", {"p_kind": kind, "p_id": str(id), "p_email": body.email}
    )
    return {"ok": True}


@router.patch("/tasks/{id}")
async def task(id: UUID, body: TaskStatus, current: Current):
    await current.repo.rpc("workspace_task", {"p_id": str(id), "p_status": body.status})
    return {"ok": True}


@router.post("/communities/{id}/posts")
async def post(id: UUID, body: Post, current: Current):
    return {
        "id": await current.repo.rpc(
            "workspace_post",
            {
                "p_community": str(id),
                "p_content": body.content,
                "p_post": str(body.post_id) if body.post_id else None,
                "p_parent": str(body.parent_id) if body.parent_id else None,
                "p_mentions": [str(m) for m in body.mentions],
            },
        )
    }


@router.put("/posts/{id}/reaction")
async def react(id: UUID, body: Toggle, current: Current):
    await current.repo.rpc(
        "workspace_react", {"p_id": str(id), "p_liked": body.enabled}
    )
    return {"ok": True}
