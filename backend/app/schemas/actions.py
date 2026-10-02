from datetime import datetime, timezone
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.schemas.student import Tags


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ApplicationStatus(Strict):
    status: Literal[
        "reviewed", "shortlisted", "interview", "selected", "rejected", "withdrawn"
    ]
    note: str = Field(default="", max_length=2000)
    interview_at: datetime | None = None


class Toggle(Strict):
    enabled: bool


class Invite(Strict):
    email: str = Field(
        min_length=3, max_length=320, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$"
    )


class TaskStatus(Strict):
    status: Literal["todo", "in_progress", "review", "done"]


class Resource(Strict):
    title: str = Field(min_length=2, max_length=160)
    url: str | None = Field(default=None, max_length=2048, pattern=r"^https://[^\s]+$")
    assignee_id: UUID | None = None
    deadline: datetime | None = None


class Space(Strict):
    title: str = Field(min_length=2, max_length=160)
    slug: str = Field(min_length=2, max_length=100, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")
    description: str = Field(default="", max_length=5000)
    tags: Tags = []


class Post(Strict):
    content: str = Field(min_length=1, max_length=2000)
    post_id: UUID | None = None
    parent_id: UUID | None = None
    mentions: list[UUID] = Field(default_factory=list, max_length=10)


class Opportunity(Strict):
    title: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=5000)
    organization_id: UUID
    university_id: UUID | None = None
    type: Literal["job", "internship", "project", "competition", "hiring_drive"]
    location: str = Field(default="", max_length=160)
    work_mode: Literal["remote", "hybrid", "on-site"]
    experience: Literal["fresher", "0-1", "1-2", "2+"] = "fresher"
    duration: str = Field(default="", max_length=80)
    tags: Tags = []
    interests: Tags = []
    roles: Tags = []
    deadline: datetime

    @model_validator(mode="after")
    def future_deadline(self):
        if self.deadline.tzinfo is None or self.deadline <= datetime.now(timezone.utc):
            raise ValueError("Choose a future deadline with a timezone")
        return self


class Event(Strict):
    title: str = Field(min_length=2, max_length=160)
    description: str = Field(default="", max_length=5000)
    community_id: UUID | None = None
    university_id: UUID | None = None
    category: Literal[
        "webinar",
        "workshop",
        "hackathon",
        "hiring_drive",
        "career_session",
        "networking",
        "startup_event",
    ]
    mode: Literal["online", "in-person", "hybrid"]
    location: str = Field(default="", max_length=160)
    starts_at: datetime
    ends_at: datetime
    deadline: datetime
    tags: Tags = []

    @model_validator(mode="after")
    def dates(self):
        if any(v.tzinfo is None for v in (self.starts_at, self.ends_at, self.deadline)):
            raise ValueError("Timezone required")
        if (
            self.ends_at <= self.starts_at
            or self.deadline > self.starts_at
            or self.deadline <= datetime.now(timezone.utc)
            or (self.community_id and self.university_id)
        ):
            raise ValueError("Invalid event")
        return self


class Preferences(Strict):
    in_app_notifications: bool = True
    profile_visibility: Literal["private", "members"] = "private"


class Report(Strict):
    category: Literal["problem", "opportunity", "support"]
    subject: str = Field(min_length=2, max_length=160)
    message: str = Field(min_length=10, max_length=4000)
