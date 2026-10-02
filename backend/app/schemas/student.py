from typing import Annotated, Literal
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

Text = Annotated[str, StringConstraints(strip_whitespace=True, max_length=160)]
Tag = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=1, max_length=80)
]
Tags = Annotated[list[Tag], Field(max_length=20)]


class ExperienceEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")
    role: Text = ""
    organization: Text = ""
    start_date: Text = ""
    end_date: Text = ""
    description: str = Field(default="", max_length=2000)


class CertificationEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: Text = ""
    issuer: Text = ""
    year: int | None = Field(default=None, ge=1950, le=2100)
    url: str = Field(default="", max_length=2048)

    @field_validator("url")
    @classmethod
    def url_valid(cls, v):
        return ProfileUpdate.safe_url(v)


class PortfolioEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")
    title: Text = ""
    description: str = Field(default="", max_length=2000)
    url: str = Field(default="", max_length=2048)

    @field_validator("url")
    @classmethod
    def url_valid(cls, v):
        return ProfileUpdate.safe_url(v)


class ProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    full_name: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=2, max_length=160)
    ]
    headline: Annotated[
        str, StringConstraints(strip_whitespace=True, max_length=240)
    ] = ""
    bio: Annotated[str, StringConstraints(strip_whitespace=True, max_length=4000)] = ""
    institution: Text = ""
    study_status: Literal[
        "",
        "First Year",
        "Second Year",
        "Third Year",
        "Fourth Year",
        "Final Year",
        "Graduated",
    ] = ""
    no_experience: bool = False
    no_certifications: bool = False
    experience_entries: list[ExperienceEntry] = Field(
        default_factory=list, max_length=20
    )
    certification_entries: list[CertificationEntry] = Field(
        default_factory=list, max_length=20
    )
    portfolio_entries: list[PortfolioEntry] = Field(default_factory=list, max_length=20)
    degree_level: Text = ""
    field_of_study: Text = ""
    current_year: int | None = Field(default=None, ge=1, le=12)
    start_year: int | None = Field(default=None, ge=1950, le=2100)
    graduation_year: int | None = Field(default=None, ge=1950, le=2100)
    skills: Tags = []
    soft_skills: Tags = []
    interests: Tags = []
    project_interests: Tags = []
    community_interests: Tags = []
    career_interests: Tags = []
    preferred_roles: Tags = []
    preferred_industries: Tags = []
    preferred_locations: Tags = []
    work_mode: Literal["", "remote", "hybrid", "on-site"] = ""
    availability: Literal[
        "",
        "immediately",
        "15 days",
        "30 days",
        "60 days",
        "not looking",
        "part-time",
        "full-time",
        "later",
    ] = ""
    languages: Tags = []
    experience: Annotated[str, StringConstraints(max_length=5000)] = ""
    certifications: Annotated[str, StringConstraints(max_length=3000)] = ""
    personal_projects: Annotated[str, StringConstraints(max_length=5000)] = ""
    portfolio_url: str = Field(default="", max_length=2048)
    linkedin_url: str = Field(default="", max_length=2048)
    github_url: str = Field(default="", max_length=2048)

    @field_validator(
        "skills",
        "soft_skills",
        "interests",
        "project_interests",
        "community_interests",
        "career_interests",
        "preferred_roles",
        "preferred_industries",
        "preferred_locations",
        "languages",
    )
    @classmethod
    def normalize(cls, values, info):
        from app.schemas.catalogs import normalize_tags

        kinds = {
            "preferred_roles": "roles",
            "preferred_industries": "industries",
            "preferred_locations": "locations",
            "languages": "languages",
            "soft_skills": "soft_skills",
        }
        kind = kinds.get(
            info.field_name,
            "interests" if info.field_name.endswith("interests") else "skills",
        )
        return normalize_tags(
            values, kind, kind in ("roles", "industries", "locations", "languages")
        )

    @model_validator(mode="after")
    def years(self):
        if self.study_status == "Graduated":
            self.current_year = None
        if (
            self.start_year
            and self.graduation_year
            and self.start_year > self.graduation_year
        ):
            raise ValueError("Graduation must follow start year")
        return self

    @field_validator("portfolio_url", "linkedin_url", "github_url")
    @classmethod
    def safe_url(cls, value):
        from urllib.parse import urlparse

        parsed = urlparse(value)
        if value and (
            parsed.scheme not in ("http", "https")
            or not parsed.hostname
            or parsed.username
            or parsed.password
        ):
            raise ValueError("Invalid URL")
        return value
