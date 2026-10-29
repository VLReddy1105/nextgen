import asyncio
from types import SimpleNamespace
import pytest
from pydantic import ValidationError
from app.core.errors import APIError
from app.services.mentors import mentor_workspace
from app.schemas.ecosystem import MentorProfile


class Repo:
    def __init__(self, profile=None):
        self.calls = []
        self.profile = profile or {}

    async def rows(self, table, **filters):
        self.calls.append((table, filters))
        assert table == "mentor_profiles"
        assert filters == {"user_id": "eq.mentor"}
        return [self.profile]

    async def rpc(self, name, data):
        self.calls.append((name, data))
        assert name == "eco_connections"
        return [
            dict(student_id="a", mentor_id="mentor", full_name="A", status="requested", skills=[" Python ", "Django"]),
            dict(student_id="b", mentor_id="mentor", full_name="B", status="accepted", skills=["postgres"]),
            dict(student_id="c", mentor_id="mentor", full_name="C", status="declined", skills=["python"]),
            dict(student_id="d", mentor_id="mentor", full_name="D", status="accepted", skills=None),
            dict(student_id="private", mentor_id="other", full_name="Private", status="accepted", skills=["python"]),
        ]


def actor(repo, role="mentor"):
    return SimpleNamespace(id="mentor", role=role, profile={"full_name": "Mentor"}, repo=repo)


def test_authorized_matching_normalizes_and_explains_without_global_discovery():
    repo = Repo({"skills": ["python", "postgresql"], "expertise": ["Django", "python"], "headline": "Engineer", "bio": "Guidance"})
    result = asyncio.run(mentor_workspace(actor(repo)))
    assert len(repo.calls) == 2
    assert [c["student_id"] for c in result["recommended_students"]] == ["a", "b"]
    assert result["recommended_students"][0]["matched_skills"] == ["django", "python"]
    assert result["recommended_students"][1]["matched_skills"] == ["postgresql"]
    assert all(c["student_id"] != "private" for c in result["connections"])
    assert result["profile_missing"] == []


def test_profile_completion_does_not_infer_affiliation_from_employer():
    result = asyncio.run(mentor_workspace(actor(Repo({"company": "A University", "headline": "  "}))))
    assert result["profile_missing"] == ["Professional headline", "Bio", "Skills or expertise"]
    assert result["recommended_students"] == []
    assert "affiliation" not in result
    assert result["profile"]["company"] == "A University"


@pytest.mark.parametrize("role", ["student", "company", "university", "founder"])
def test_other_roles_cannot_load_mentor_projection(role):
    repo = Repo()
    with pytest.raises(APIError) as exc:
        asyncio.run(mentor_workspace(actor(repo, role)))
    assert exc.value.status == 403
    assert repo.calls == []


@pytest.mark.parametrize("field", ["full_name", "headline"])
def test_profile_rejects_blank_required_fields(field):
    with pytest.raises(ValidationError):
        MentorProfile(**{"full_name": "Mentor", "headline": "Engineer", field: "   "})


@pytest.mark.parametrize("field,value", [("affiliation", "company"), ("organization_id", "other"), ("primary_role", "company"), ("resume_path", "student/private.pdf")])
def test_profile_cannot_self_assign_organization_or_private_documents(field, value):
    with pytest.raises(ValidationError):
        MentorProfile(full_name="Mentor", headline="Engineer", **{field: value})


def test_profile_normalizes_supported_fields():
    profile = MentorProfile(full_name="  Mentor  ", headline=" Engineer ", skills=["Python, Django", "python"])
    assert profile.full_name == "Mentor"
    assert profile.skills == ["python", "django"]


def test_project_matches_require_contextual_head_and_accepted_mentee():
    repo = Repo({"skills": ["python"]})
    projects = [
        dict(id="owned", joined=True, my_role="project_head", tags=["PostgreSQL", "python"]),
        dict(id="member", joined=True, my_role="mentor", tags=["python"]),
        dict(id="stranger", joined=False, my_role=None, tags=["python"]),
    ]
    result = asyncio.run(mentor_workspace(actor(repo), projects))
    assert list(result["project_matches"]) == ["owned"]
    assert [c["student_id"] for c in result["project_matches"]["owned"]] == ["b"]
    assert len(repo.calls) == 2
