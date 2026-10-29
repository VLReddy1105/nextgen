import asyncio
from types import SimpleNamespace
from uuid import uuid4
import pytest
from pydantic import ValidationError
from app.core.errors import APIError
from app.services.mentor_affiliations import hub, badges, optional_hub
from app.api.routes.mentor_affiliations import MentorOpportunity, AffiliationDecision, publish, apply, status
from app.schemas.actions import ApplicationStatus


class Repo:
    def __init__(self, error=None, snapshot=None):
        self.error, self.snapshot, self.calls = error, snapshot or {}, []

    async def rpc(self, name, params):
        self.calls.append((name, params))
        if name == "eco_mentor_hub":
            if self.error:
                raise self.error
            return self.snapshot
        if name == "eco_mentor_badges":
            if self.error:
                raise self.error
            return []
        return "id"


def actor(repo, role="mentor"):
    return SimpleNamespace(role=role, repo=repo)


def test_missing_schema_is_explicit_and_other_errors_not_hidden():
    current = actor(Repo(APIError("SCHEMA_REQUIRED", "Missing migration", 503)))
    assert asyncio.run(hub(current)) == {"available": False}
    assert asyncio.run(badges(current, [str(uuid4())])) is None
    for code in ("FORBIDDEN", "DATABASE_ERROR"):
        with pytest.raises(APIError):
            asyncio.run(hub(actor(Repo(APIError(code, "Failure")))))
    assert asyncio.run(optional_hub(actor(Repo(), "founder"))) is None


def test_missing_schema_cannot_fall_back_to_old_student_publishing_rpc():
    repo = Repo(APIError("SCHEMA_REQUIRED", "Missing migration", 503))
    body = MentorOpportunity(organization_id=uuid4(), title="Mentor opening", deadline="2099-01-01T00:00:00Z")
    with pytest.raises(APIError):
        asyncio.run(publish(body, actor(repo, "company")))
    assert [call[0] for call in repo.calls] == ["eco_mentor_hub"]


@pytest.mark.parametrize("role", ["student", "founder", "mentor"])
def test_only_organization_roles_publish(role):
    repo = Repo()
    body = MentorOpportunity(organization_id=uuid4(), title="Mentor opening", deadline="2099-01-01T00:00:00Z")
    with pytest.raises(APIError):
        asyncio.run(publish(body, actor(repo, role)))
    assert repo.calls == []


def test_constrained_audience_and_organization_validation():
    with pytest.raises(ValidationError):
        MentorOpportunity(organization_id=uuid4(), title="Mentor opening", audience="student", deadline="2099-01-01T00:00:00Z")
    with pytest.raises(ValidationError):
        AffiliationDecision(action="self-approve")
    repo = Repo()
    body = MentorOpportunity(organization_id=uuid4(), title="Mentor opening", deadline="2099-01-01T00:00:00Z")
    asyncio.run(publish(body, actor(repo, "university")))
    assert repo.calls[1][1]["p_data"]["audience"] == "mentor"


@pytest.mark.parametrize("role", ["student", "company", "university", "founder"])
def test_non_mentor_cannot_apply_as_mentor(role):
    repo = Repo()
    with pytest.raises(APIError):
        asyncio.run(apply(uuid4(), actor(repo, role)))
    assert repo.calls == []


def test_status_only_for_authorized_mentor_application_and_no_affiliation_side_effect():
    application_id = uuid4()
    repo = Repo(snapshot={"applications": [{"id": str(application_id)}]})
    asyncio.run(status(application_id, ApplicationStatus(status="selected"), actor(repo, "company")))
    assert [name for name, _ in repo.calls] == ["eco_mentor_hub", "workspace_application_status"]
    repo = Repo(snapshot={"applications": []})
    with pytest.raises(APIError):
        asyncio.run(status(application_id, ApplicationStatus(status="selected"), actor(repo, "company")))
    assert len(repo.calls) == 1
