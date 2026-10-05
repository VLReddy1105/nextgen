from dataclasses import replace
from datetime import datetime, timezone
from fastapi import APIRouter
from app.api.dependencies import Current
from app.services.students import student_core
from app.services.catalog import catalog, applications
from app.repositories.workspace_reads import WorkspaceReads
from app.services.concurrency import gather

router = APIRouter(prefix="/api/v1/workspace", tags=["workspace"])


@router.get("")
async def workspace(current: Current):
    reads = WorkspaceReads(current.repo)
    try:
        return await aggregate_workspace(replace(current, repo=reads))
    finally:
        await reads.close()


async def aggregate_workspace(current):
    if current.role != "student":
        return await role_workspace(current)
    _, profile = await gather(
        current.repo.rpc("workspace_refresh_reminders", {}), student_core(current)
    )
    (
        opportunities,
        projects,
        communities,
        events,
        mentors,
        apps,
        notifications,
        sessions,
    ) = await gather(
        catalog(current, "opportunities", profile),
        catalog(current, "projects", profile),
        catalog(current, "communities", profile),
        catalog(current, "events", profile),
        catalog(current, "mentorship", profile),
        applications(current),
        current.repo.rows(
            "notifications",
            recipient_user_id=f"eq.{current.id}",
            order="created_at.desc",
        ),
        current.repo.rows("mentor_sessions", student_id=f"eq.{current.id}"),
    )
    active = [
        a for a in apps if a["status"] not in ("rejected", "withdrawn", "selected")
    ]
    now = datetime.now(timezone.utc).isoformat()
    upcoming = [e for e in events if e["registered"] and e["ends_at"] > now]
    notices = [n for n in notifications if not n["read_at"]]
    return {
        "profile": profile,
        "opportunities": opportunities,
        "projects": projects,
        "communities": communities,
        "events": events,
        "mentors": mentors,
        "applications": apps,
        "notifications": notifications,
        "sessions": sessions,
        "counts": {
            "opportunities": sum(
                not o["applied"] and o["match"]["score"] > 0 for o in opportunities
            ),
            "applications": len(active),
            "projects": sum(p["joined"] for p in projects),
            "communities": sum(c["joined"] for c in communities),
            "events": len(upcoming),
            "notifications": len(notices),
        },
        "module_unread": {
            module: sum(n["source_module"] == module for n in notices)
            for module in (
                "opportunities",
                "applications",
                "projects",
                "communities",
                "events",
                "mentorship",
            )
        },
    }


async def role_workspace(current):
    profile = {
        **current.profile,
        "email": current.email,
        "email_verified": True,
        "skills": [],
        "interests": [],
        "memberships": [],
        "completion": {
            "percent": 100 if current.profile.get("headline") else 50,
            "checklist": [],
        },
    }
    (
        orgs,
        opps,
        projects,
        communities,
        events,
        registrations,
        apps,
        notices,
        sessions,
        activity,
    ) = await gather(
        current.repo.rows("organizations", created_by=f"eq.{current.id}"),
        current.repo.rows(
            "opportunities", created_by=f"eq.{current.id}", order="created_at.desc"
        ),
        catalog(current, "projects", profile),
        catalog(current, "communities", profile),
        current.repo.rows(
            "events", organizer_id=f"eq.{current.id}", order="starts_at.desc"
        ),
        current.repo.rows("event_registrations"),
        applications(current),
        current.repo.rows(
            "notifications", recipient_user_id=f"eq.{current.id}", order="created_at.desc"
        ),
        current.repo.rows("mentor_sessions", mentor_id=f"eq.{current.id}"),
        current.repo.rows("ecosystem_activity", order="created_at.desc", limit="30"),
    )
    for e in events:
        e["member_count"] = sum(r["event_id"] == e["id"] for r in registrations)
    extra = {}
    if current.role == "university" and orgs and orgs[0]["verified"]:
        progress = await current.repo.rpc(
            "eco_campus_progress", {"p_university": orgs[0]["id"]}
        )
        extra["students"] = len(progress)
    if current.role == "mentor":
        connections = await current.repo.rpc("eco_connections", {})
        extra["connections"] = sum(c["status"] == "accepted" for c in connections)
        extra["sessions"] = len(sessions)
    return {
        "profile": profile,
        "organizations": orgs,
        "opportunities": opps,
        "projects": projects,
        "communities": communities,
        "events": events,
        "applications": apps,
        "notifications": notices,
        "sessions": sessions,
        "mentors": [],
        "activity": activity,
        "counts": {
            **extra,
            "opportunities": sum(o["status"] == "published" for o in opps),
            "applications": sum(
                a["status"] not in ("rejected", "withdrawn", "selected") for a in apps
            ),
            "projects": sum(p["joined"] for p in projects),
            "communities": sum(c["joined"] for c in communities),
            "events": sum(
                e["status"] == "published"
                and e["ends_at"] > datetime.now(timezone.utc).isoformat()
                for e in events
            ),
            "notifications": sum(not n["read_at"] for n in notices),
        },
        "module_unread": {
            m: sum(n["source_module"] == m and not n["read_at"] for n in notices)
            for m in [
                "opportunities",
                "applications",
                "projects",
                "communities",
                "events",
                "mentorship",
            ]
        },
    }
