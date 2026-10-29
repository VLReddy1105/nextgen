from typing import Literal
from uuid import UUID
from fastapi import APIRouter
from app.api.dependencies import Current
from app.core.errors import require
from app.schemas.actions import Strict, ApplicationStatus
from app.schemas.ecosystem import OpportunityEdit, SessionCreate
from app.services.mentor_affiliations import hub

router = APIRouter(prefix="/api/v1/mentor-hub", tags=["mentor affiliations"])


class AffiliationRequest(Strict):
    organization_id: UUID
    mentor_user_id: UUID | None = None


class AffiliationDecision(Strict):
    action: Literal["accept", "reject", "cancel", "end"]


class MentorOpportunity(OpportunityEdit):
    audience: Literal["mentor"] = "mentor"


class ScopedSession(SessionCreate):
    organization_id: UUID


@router.get("")
async def listing(current: Current):
    require(current.role in ("mentor", "company", "university"))
    return await hub(current)


@router.post("/affiliations")
async def request(body: AffiliationRequest, current: Current):
    return {"id": await current.repo.rpc("eco_mentor_affiliation_request", {
        "p_org": str(body.organization_id),
        "p_mentor": str(body.mentor_user_id) if body.mentor_user_id else None,
    })}


@router.post("/affiliations/{id}/decision")
async def decide(id: UUID, body: AffiliationDecision, current: Current):
    await current.repo.rpc("eco_mentor_affiliation_decide", {"p_id": str(id), "p_action": body.action})
    return {"ok": True}


@router.post("/opportunities")
async def publish(body: MentorOpportunity, current: Current):
    require(current.role in ("company", "university"))
    await hub(current, required=True)
    return {"id": await current.repo.rpc("eco_opportunity_save", {"p_data": body.model_dump(mode="json")})}


@router.patch("/opportunities/{id}")
async def edit(id: UUID, body: MentorOpportunity, current: Current):
    require(current.role in ("company", "university"))
    await hub(current, required=True)
    return {"id": await current.repo.rpc("eco_opportunity_save", {"p_id": str(id), "p_data": body.model_dump(mode="json")})}


@router.post("/opportunities/{id}/applications")
async def apply(id: UUID, current: Current):
    require(current.role == "mentor")
    await hub(current, required=True)
    return {"id": await current.repo.rpc("workspace_apply", {"p_id": str(id)})}


@router.patch("/applications/{id}/status")
async def status(id: UUID, body: ApplicationStatus, current: Current):
    snapshot = await hub(current, required=True)
    require(any(a["id"] == str(id) for a in snapshot["applications"]))
    await current.repo.rpc("workspace_application_status", {"p_id": str(id), "p_status": body.status, "p_note": body.note, "p_interview_at": body.interview_at.isoformat() if body.interview_at else None})
    return {"ok": True}


@router.post("/sessions")
async def scoped_session(body: ScopedSession, current: Current):
    require(current.role == "mentor")
    return {"id": await current.repo.rpc("eco_mentor_session_scoped", {"p_org": str(body.organization_id), "p_student": str(body.student_id), "p_title": body.title, "p_starts": body.starts_at.isoformat(), "p_url": body.meeting_url})}
