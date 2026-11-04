import asyncio
from types import SimpleNamespace
import pytest
from pydantic import ValidationError
from app.services.catalog import catalog
from app.api.routes import events, opportunities
from app.schemas.ecosystem import SessionCreate


@pytest.mark.parametrize("verified", [True, False])
def test_university_workspace_uses_campus_not_first_owned_organization(monkeypatch, verified):
    from app.api.routes import workspace

    async def empty(*args):
        return []

    monkeypatch.setattr(workspace, "catalog", empty)
    monkeypatch.setattr(workspace, "applications", empty)
    monkeypatch.setattr(workspace, "optional_hub", empty)
    calls = []

    class Repo:
        async def rows(self, table, **filters):
            if table == "organizations":
                return [
                    {"id": "other", "type": "community", "verified": True},
                    {"id": "campus", "type": "university", "verified": verified},
                ]
            return []

        async def rpc(self, name, params):
            calls.append((name, params))
            assert params == {"p_university": "campus"}
            return [{"student_id": "student"}]

    current = SimpleNamespace(id="owner", role="university", email="owner@example.test", profile={}, repo=Repo())
    result = asyncio.run(workspace.role_workspace(current))
    assert result["counts"].get("students", 0) == (1 if verified else 0)
    assert len(calls) == (1 if verified else 0)


def test_catalog_reflects_pending_invitation_request_and_contextual_role():
    calls = []
    class Repo:
        async def rows(self, table, **filters):
            calls.append((table, filters))
            return {
                "projects": [{"id": "joined", "title": "Owned"}, {"id": "invited", "title": "Invited"}, {"id": "expired", "title": "Expired"}, {"id": "requested", "title": "Requested"}],
                "project_members": [{"project_id": "joined", "role": "team_lead"}],
                "workspace_invitations": [dict(kind="projects", entity_id=id, status="pending", expires_at=expiry) for id, expiry in [("invited", "2099-01-01"), ("expired", "2000-01-01")]],
                "space_join_requests": [{"kind": "projects", "entity_id": "requested", "status": "pending"}],
            }.get(table, [])
        async def rpc(self, name, params):
            return []
    current = SimpleNamespace(id="actor", repo=Repo())
    rows = asyncio.run(catalog(current, "projects", {"skills": [], "interests": []}))
    indexed = {r["id"]: r for r in rows}
    assert indexed["joined"]["my_role"] == "team_lead"
    assert indexed["invited"]["invitation_status"] == "pending"
    assert indexed["expired"]["invitation_status"] is None
    assert indexed["requested"]["join_request_status"] == "pending"
    for table, filters in calls:
        if table in ("project_members", "space_join_requests"):
            assert filters["user_id"] == "eq.actor"
        if table == "workspace_invitations":
            assert filters["recipient_user_id"] == "eq.actor"


def test_mentor_catalog_keeps_request_state_to_prevent_duplicate_actions():
    class Repo:
        async def rows(self, table, **filters):
            if table == "mentor_profiles":
                return [{"user_id": "mentor", "expertise": ["python"], "availability_status": "available"}]
            assert filters["student_id"] == "eq.student"
            return [{"mentor_id": "mentor", "status": "requested"}]
        async def rpc(self, name, params):
            if name == "eco_mentor_badges":
                return []
            return [{"user_id": "mentor", "full_name": "Mentor"}]
    rows = asyncio.run(catalog(SimpleNamespace(id="student", repo=Repo()), "mentorship", {"skills": ["python"], "interests": []}))
    assert rows[0]["connection_status"] == "requested"


@pytest.mark.parametrize("actor, expected", [("reader", False), ("owner", True)])
def test_publication_details_expose_actual_ownership(actor, expected):
    class Repo:
        async def rows(self, table, **filters):
            return {"events": [{"id": "event", "organizer_id": "owner"}], "opportunities": [{"id": "opportunity", "created_by": "owner", "organization_id": "org"}], "organizations": [{"id": "org", "name": "Publisher"}]}.get(table, [])
    current = SimpleNamespace(id=actor, repo=Repo())
    assert asyncio.run(events.detail("event", current))["can_manage"] is expected
    opportunity = asyncio.run(opportunities.detail("opportunity", current))
    assert opportunity["can_manage"] is expected
    assert opportunity["organization"] == "Publisher"


@pytest.mark.parametrize("starts,url", [("2000-01-01T00:00:00Z", ""), ("2099-01-01T00:00:00", ""), ("2099-01-01T00:00:00Z", "http://example.test")])
def test_session_validation_matches_database_rules(starts, url):
    with pytest.raises(ValidationError):
        SessionCreate(student_id="00000000-0000-0000-0000-000000000001", title="Guidance", starts_at=starts, meeting_url=url)
