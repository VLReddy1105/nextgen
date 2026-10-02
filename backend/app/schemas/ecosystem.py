from datetime import datetime, timezone
from typing import Literal
from uuid import UUID
from pydantic import Field, field_validator, model_validator
from app.schemas.actions import Strict
from app.schemas.catalogs import normalize_tags
from app.schemas.student import ProfileUpdate


class Decision(Strict):
    accept: bool


class SpaceEdit(Strict):
    title: str = Field(min_length=2, max_length=160)
    slug: str = Field(min_length=2, max_length=100, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")
    short_description: str = Field(min_length=2, max_length=500)
    description: str = Field(default="", max_length=10000)
    tags: list[str] = Field(min_length=1, max_length=20)
    category: str = Field(default="Other", max_length=80)
    visibility: Literal[
        "private", "public", "university_scoped", "organization_scoped"
    ] = "private"
    join_policy: Literal["invite_only", "request_to_join", "open_join"] = "invite_only"
    organization_id: UUID | None = None
    community_id: UUID | None = None
    project_url: str = Field(default="", max_length=2048)
    expected_team_size: int | None = Field(default=None, ge=1, le=1000)

    @field_validator("tags", mode="before")
    @classmethod
    def tags_valid(cls, v):
        return normalize_tags(v)

    @field_validator("project_url")
    @classmethod
    def url_valid(cls, v):
        return ProfileUpdate.safe_url(v)

    @model_validator(mode="after")
    def combination(self):
        if self.visibility == "private" and self.join_policy == "open_join":
            raise ValueError("Private spaces require invitation or request")
        if self.organization_id and self.community_id:
            raise ValueError("Choose one owning context")
        return self


class SpaceInvite(Strict):
    email: str = Field(max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    requested_role: Literal["member", "team_lead", "mentor", "moderator"] = "member"


class CodeCreate(Strict):
    days: int = Field(default=7, ge=1, le=30)
    usage_limit: int = Field(default=10, ge=1, le=100)


class CodeToken(Strict):
    token: str = Field(min_length=20, max_length=200, pattern=r"^[A-Za-z0-9_-]+$")


class TaskEdit(Strict):
    title: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=5000)
    assignee_id: UUID | None = None
    status: Literal["todo", "in_progress", "review", "done"] = "todo"
    priority: Literal["low", "medium", "high", "urgent"] = "medium"
    deadline: datetime | None = None


class Eligibility(Strict):
    programs: list[str] = Field(default_factory=list, max_length=20)
    years: list[int] = Field(default_factory=list, max_length=12)
    graduation_years: list[int] = Field(default_factory=list, max_length=30)
    skills: list[str] = Field(default_factory=list, max_length=20)


class OpportunityEdit(Strict):
    title: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=10000)
    organization_id: UUID
    university_id: UUID | None = None
    type: Literal["job", "internship", "project", "competition", "hiring_drive"] = (
        "internship"
    )
    tags: list[str] = Field(default_factory=list, max_length=20)
    nice_to_have: list[str] = Field(default_factory=list, max_length=20)
    interests: list[str] = Field(default_factory=list, max_length=20)
    roles: list[str] = Field(default_factory=list, max_length=20)
    location: str = Field(default="", max_length=160)
    work_mode: Literal["remote", "hybrid", "on-site"] = "remote"
    experience: Literal["fresher", "0-1", "1-2", "2+"] = "fresher"
    duration: str = Field(default="", max_length=80)
    deadline: datetime
    openings: int = Field(default=1, ge=1, le=10000)
    eligibility: Eligibility = Field(default_factory=Eligibility)
    status: Literal["draft", "published", "closed"] = "draft"

    @field_validator("tags", "nice_to_have", mode="before")
    @classmethod
    def normalize(cls, v):
        return normalize_tags(v)

    @model_validator(mode="after")
    def published(self):
        if self.deadline.tzinfo is None:
            raise ValueError("Timezone required")
        if self.status == "published" and (
            not self.tags
            or len(self.description) < 10
            or self.deadline <= datetime.now(timezone.utc)
            or (self.work_mode != "remote" and not self.location)
        ):
            raise ValueError("Complete the required publishing fields")
        return self


class EventEdit(Strict):
    title: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=10000)
    university_id: UUID | None = None
    community_id: UUID | None = None
    category: Literal[
        "webinar",
        "workshop",
        "hackathon",
        "hiring_drive",
        "career_session",
        "networking",
        "startup_event",
        "placement_session",
    ] = "workshop"
    mode: Literal["online", "in-person", "hybrid"] = "online"
    location: str = Field(min_length=2, max_length=2048)
    starts_at: datetime
    ends_at: datetime
    deadline: datetime
    tags: list[str] = Field(default_factory=list, max_length=20)
    status: Literal["draft", "published", "cancelled"] = "draft"
    capacity: int | None = Field(default=None, ge=1, le=100000)
    eligibility: Eligibility = Field(default_factory=Eligibility)

    @model_validator(mode="after")
    def dates(self):
        if any(d.tzinfo is None for d in [self.starts_at, self.ends_at, self.deadline]):
            raise ValueError("Timezone required")
        if self.ends_at <= self.starts_at or self.deadline > self.starts_at:
            raise ValueError("Invalid event schedule")
        if self.status == "published" and self.deadline <= datetime.now(timezone.utc):
            raise ValueError("Future deadline required")
        return self


class MentorProfile(Strict):
    full_name: str = Field(min_length=2, max_length=160)
    headline: str = Field(min_length=2, max_length=240)
    bio: str = Field(default="", max_length=4000)
    current_position: str = Field(default="", max_length=160)
    company: str = Field(default="", max_length=160)
    years_experience: int = Field(default=0, ge=0, le=80)
    expertise: list[str] = Field(default_factory=list, max_length=20)
    skills: list[str] = Field(default_factory=list, max_length=20)
    industry: str = Field(default="", max_length=160)
    linkedin_url: str = Field(default="", max_length=2048)
    portfolio_url: str = Field(default="", max_length=2048)
    topics: list[str] = Field(default_factory=list, max_length=20)
    availability_status: Literal["available", "limited", "unavailable"] = "available"

    @field_validator("linkedin_url", "portfolio_url")
    @classmethod
    def urls(cls, v):
        return ProfileUpdate.safe_url(v)

    @field_validator("expertise", "skills", "topics", mode="before")
    @classmethod
    def tags(cls, v):
        return normalize_tags(v)


class SessionCreate(Strict):
    student_id: UUID
    title: str = Field(min_length=2, max_length=160)
    starts_at: datetime
    meeting_url: str = Field(default="", max_length=2048)

    @field_validator("meeting_url")
    @classmethod
    def url(cls, v):
        return ProfileUpdate.safe_url(v)


class DomainSave(Strict):
    domain: str = Field(
        min_length=4, max_length=253, pattern=r"^[a-z0-9][a-z0-9.-]+\.[a-z]{2,}$"
    )
    auto_enrollment: bool = False


class Announcement(Strict):
    title: str = Field(min_length=2, max_length=160)
    body: str = Field(min_length=2, max_length=5000)
    url: str = Field(default="", max_length=2048)
    important: bool = False

    @field_validator("url")
    @classmethod
    def safe(cls, v):
        return ProfileUpdate.safe_url(v)
