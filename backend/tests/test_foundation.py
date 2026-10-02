import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from app.main import app
from app.schemas.student import ProfileUpdate
from app.services.students import completion
from app.matching.rank import match, rank, eligible

client = TestClient(app)


def test_health_and_unauthenticated():
    assert client.get("/health").json() == {"status": "ok"}
    result = client.get("/api/v1/students/me")
    assert result.status_code == 401
    assert result.json()["error"]["code"] == "UNAUTHENTICATED"


def test_profile_validation_and_normalization():
    profile = ProfileUpdate(
        full_name="  Student Name ", skills=["Python", " python ", "Django"]
    )
    assert profile.skills == ["python", "django"]
    assert profile.full_name == "Student Name"
    with pytest.raises(ValidationError):
        ProfileUpdate(full_name="S", primary_role="company")
    with pytest.raises(ValidationError):
        ProfileUpdate(full_name="Student", github_url="javascript:alert(1)")


def test_completion_recalculates():
    before = completion({"full_name": "Student", "email_verified": True})
    after = completion(
        {"full_name": "Student", "email_verified": True, "skills": ["python"]}
    )
    assert after["percent"] > before["percent"]


def test_matching_is_deterministic_and_explained():
    profile = {"skills": ["Python", "Django"], "interests": ["Backend"]}
    python = {"id": "a", "tags": ["Python", "FastAPI"], "interests": ["backend"]}
    java = {"id": "b", "tags": ["Java", "Spring"]}
    assert rank(profile, [java, python])[0]["id"] == "a"
    assert match(profile, python)["matched_skills"] == ["python"]
    assert match(profile, python) == match(profile, python)
    assert (
        match(profile, {"expertise": ["Python", "Django"]})["score"]
        > match(profile, {"expertise": ["Java"]})["score"]
    )


def test_expired_hidden_disabled_excluded():
    assert not eligible({"deadline": "2020-01-01T00:00:00Z"})
    assert not eligible({"status": "disabled"})
    assert eligible({"status": "published"})
