import pytest
from pydantic import ValidationError
from app.schemas.student import ProfileUpdate
from app.schemas.ecosystem import OpportunityEdit, SpaceEdit, CodeCreate, EventEdit
from app.schemas.catalogs import normalize_tags
from app.services.students import completion


def test_catalog_domains_and_pasted_tags():
    assert normalize_tags(["Python Django;FastAPI\nPostgreSQL"]) == [
        "python",
        "django",
        "fastapi",
        "postgresql",
    ]
    assert normalize_tags(["Hyderabad"], "locations", True) == ["hyderabad"]
    for field, value in [
        ("preferred_locations", ["Remote"]),
        ("preferred_roles", ["Python"]),
        ("languages", ["Backend Developer"]),
    ]:
        with pytest.raises(ValidationError):
            ProfileUpdate(full_name="Student Name", **{field: value})
    with pytest.raises(ValueError):
        normalize_tags(["I am a developer who knows many programming languages"])


def test_graduated_and_fresher_completion():
    profile = ProfileUpdate(
        full_name="Student Name",
        study_status="Graduated",
        current_year=4,
        no_experience=True,
        no_certifications=True,
    )
    assert profile.current_year is None
    fresher = completion(
        {
            **profile.model_dump(),
            "email_verified": True,
            "headline": "Developer",
            "degree_level": "Bachelor",
            "field_of_study": "CS",
            "skills": ["python"],
            "preferred_roles": ["backend developer"],
            "availability": "immediately",
        }
    )
    assert fresher["percent"] == 100


def test_structured_urls_and_limits():
    with pytest.raises(ValidationError):
        ProfileUpdate(
            full_name="Student Name",
            portfolio_entries=[{"title": "Project", "url": "javascript:alert(1)"}],
        )
    with pytest.raises(ValidationError):
        CodeCreate(days=100, usage_limit=0)
    with pytest.raises(ValidationError):
        SpaceEdit(
            title="Project",
            slug="project",
            short_description="Private work",
            tags=["python"],
            visibility="private",
            join_policy="open_join",
        )


def test_past_publication_rejected():
    with pytest.raises(ValidationError):
        OpportunityEdit(
            title="Internship",
            description="Work with the team",
            organization_id="00000000-0000-0000-0000-000000000001",
            tags=["python"],
            deadline="2020-01-01T00:00:00Z",
            status="published",
        )
    with pytest.raises(ValidationError):
        EventEdit(
            title="Workshop",
            location="Online",
            starts_at="2099-01-01T01:00:00Z",
            ends_at="2099-01-01T00:00:00Z",
            deadline="2099-01-01T00:00:00Z",
        )
