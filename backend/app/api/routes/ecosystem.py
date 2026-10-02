from uuid import UUID
from fastapi import APIRouter
from app.api.dependencies import Current, Student
from app.schemas.ecosystem import (
    Decision,
    MentorProfile,
    SessionCreate,
    DomainSave,
    Announcement,
)
from app.core.errors import require
from app.schemas.ecosystem import SpaceInvite
import secrets, hashlib

router = APIRouter(prefix="/api/v1", tags=["ecosystem"])


@router.post("/campus/{id}/invitations")
async def invite_student(id: UUID, body: SpaceInvite, current: Current):
    token = secrets.token_hex(32)
    return {
        "status": await current.repo.rpc(
            "eco_campus_invite",
            {
                "p_university_id": str(id),
                "p_email": body.email,
                "p_token_hash": hashlib.sha256(token.encode()).hexdigest(),
            },
        ),
        "token": token,
    }


@router.get("/campus")
async def campus(current: Current):
    orgs = await current.repo.rows("organizations")
    own = [
        o for o in orgs if o["created_by"] == current.id and o["type"] == "university"
    ]
    domains = await current.repo.rows("university_domains")
    return {
        "organizations": orgs,
        "domains": domains,
        "matching_domains": [
            d
            for d in domains
            if d["approved_at"] and d["domain"] == current.email.lower().split("@")[-1]
        ],
        "requests": await current.repo.rpc("eco_campus_requests", {}),
        "invitations": (
            await current.repo.rpc("eco_campus_invitations", {})
            if current.role == "student"
            else await current.repo.rows(
                "university_student_invitations",
                select="id,email,program,department,status,expires_at",
            )
        ),
        "announcements": await current.repo.rows(
            "campus_announcements", order="created_at.desc"
        ),
        "progress": (
            await current.repo.rpc(
                "eco_campus_progress", {"p_university": own[0]["id"]}
            )
            if own and own[0]["verified"]
            else []
        ),
    }


@router.put("/campus/{id}/domain")
async def domain(id: UUID, body: DomainSave, current: Current):
    await current.repo.rpc(
        "eco_domain_save",
        {
            "p_university": str(id),
            "p_domain": body.domain,
            "p_auto": body.auto_enrollment,
        },
    )
    return {"ok": True}


@router.post("/campus/{id}/connect")
async def connect(id: UUID, current: Student):
    return {
        "status": await current.repo.rpc(
            "eco_university_connect", {"p_university": str(id)}
        )
    }


@router.post("/campus/requests/{id}/decision")
async def campus_decide(id: UUID, body: Decision, current: Current):
    await current.repo.rpc(
        "eco_university_decide", {"p_id": str(id), "p_accept": body.accept}
    )
    return {"ok": True}


@router.post("/campus/invitations/{id}/decision")
async def campus_invite(id: UUID, body: Decision, current: Student):
    await current.repo.rpc(
        "eco_campus_invitation_decide", {"p_id": str(id), "p_accept": body.accept}
    )
    return {"ok": True}


@router.post("/campus/{id}/announcements")
async def announcement(id: UUID, body: Announcement, current: Current):
    return {
        "id": await current.repo.rpc(
            "eco_announcement",
            {
                "p_university": str(id),
                **{"p_" + k: v for k, v in body.model_dump().items()},
            },
        )
    }


@router.get("/mentor/profile")
async def mentor_profile(current: Current):
    require(current.role == "mentor")
    rows = await current.repo.rows("mentor_profiles", user_id=f"eq.{current.id}")
    return {**(rows[0] if rows else {}), "full_name": current.profile["full_name"]}


@router.put("/mentor/profile")
async def save_mentor(body: MentorProfile, current: Current):
    await current.repo.rpc("eco_mentor_profile", {"p_data": body.model_dump()})
    return {"ok": True}


@router.get("/connections")
async def connections(current: Current):
    return {"items": await current.repo.rpc("eco_connections", {})}


@router.post("/mentorship/{id}/request")
async def request_mentor(id: UUID, current: Student):
    await current.repo.rpc("eco_mentor_request", {"p_mentor": str(id)})
    return {"ok": True}


@router.post("/connections/{id}/decision")
async def decide_mentor(id: UUID, body: Decision, current: Current):
    await current.repo.rpc(
        "eco_mentor_decide", {"p_student": str(id), "p_accept": body.accept}
    )
    return {"ok": True}


@router.post("/sessions")
async def session(body: SessionCreate, current: Current):
    return {
        "id": await current.repo.rpc(
            "eco_mentor_session",
            {
                "p_student": str(body.student_id),
                "p_title": body.title,
                "p_starts": body.starts_at.isoformat(),
                "p_url": body.meeting_url,
            },
        )
    }
