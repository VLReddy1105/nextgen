from dataclasses import replace
import asyncio
import json
import logging
from datetime import datetime, timezone
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.api.dependencies import Current
from app.services.students import student_core
from app.services.mentors import mentor_reads, mentor_projection
from app.services.mentor_affiliations import optional_hub
from app.services.catalog import catalog, applications
from app.repositories.workspace_reads import WorkspaceReads
from app.services.concurrency import gather

router = APIRouter(prefix="/api/v1/workspace", tags=["workspace"])


@router.get("/progressive")
async def progressive_workspace(current: Current, full_notifications: bool = False):
    """One authorized request; publish independent Student sections as ready."""
    reads = WorkspaceReads(current.repo)
    actor = replace(current, repo=reads)
    # Finish the existing reminder write before entering the disconnect-cancellable
    # read stream. Non-Student consumers retain the existing full response shape.
    try:
        if actor.role != "student":
            result = await role_workspace(actor, full_notifications)
            await reads.close()
            return StreamingResponse(iter([json.dumps(result) + "\n"]), media_type="application/x-ndjson")
        _, profile = await gather(
            actor.repo.rpc("workspace_refresh_reminders", {}), student_core(actor)
        )
    except BaseException:
        await reads.close()
        raise

    async def stream():
        tasks = []
        try:
            pending = ["opportunities", "projects", "communities", "events", "mentors",
                       "applications", "notifications", "sessions", "invitations"]
            yield json.dumps({"profile": profile, "pending": pending, "notification_details_loaded": full_notifications,
                              **{key: [] for key in pending}, "counts": {}, "module_unread": {}}) + "\n"

            async def section(key, operation):
                items = await operation
                counts = {}
                unread = {}
                if key == "opportunities":
                    counts[key] = sum(not o["applied"] and o["match"]["score"] > 0 for o in items)
                elif key in ("projects", "communities"):
                    counts[key] = sum(i["joined"] for i in items)
                elif key == "applications":
                    counts[key] = sum(i["status"] not in ("rejected", "withdrawn", "selected") for i in items)
                elif key == "events":
                    now = datetime.now(timezone.utc).isoformat()
                    counts[key] = sum(i["registered"] and i["ends_at"] > now for i in items)
                elif key == "notifications":
                    notices = [n for n in items if not n["read_at"]]
                    counts[key] = len(notices)
                    unread = {m: sum(n["source_module"] == m for n in notices) for m in
                              ("opportunities", "applications", "projects", "communities", "events", "mentorship")}
                return {key: [] if key == "notifications" and not full_notifications else items,
                        **({"notification_details_loaded": full_notifications} if key == "notifications" else {}),
                        "counts": counts, "module_unread": unread, "ready": key}

            operations = {
                **{key: catalog(actor, kind, profile) for key, kind in
                   (("opportunities", "opportunities"), ("projects", "projects"),
                    ("communities", "communities"), ("events", "events"), ("mentors", "mentorship"))},
                "applications": applications(actor),
                "notifications": actor.repo.rows("notifications", select="*" if full_notifications else "id,read_at,source_module", recipient_user_id=f"eq.{actor.id}", order="created_at.desc"),
                "sessions": actor.repo.rows("mentor_sessions", student_id=f"eq.{actor.id}"),
                "invitations": actor.repo.rows("workspace_invitations", recipient_user_id=f"eq.{actor.id}"),
            }
            tasks = [asyncio.create_task(section(key, operation)) for key, operation in operations.items()]
            for task in asyncio.as_completed(tasks):
                yield json.dumps(await task) + "\n"
        except Exception:
            logging.getLogger(__name__).exception("Progressive workspace read failed")
            yield json.dumps({"error": "Could not finish loading workspace. Please retry."}) + "\n"
        finally:
            for task in tasks:
                if not task.done():
                    task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
            await reads.close()

    return StreamingResponse(stream(), media_type="application/x-ndjson",
                             headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no"})


@router.get("")
async def workspace(current: Current, full_notifications: bool = True):
    reads = WorkspaceReads(current.repo)
    try:
        return await aggregate_workspace(replace(current, repo=reads), full_notifications)
    finally:
        await reads.close()


async def aggregate_workspace(current, full_notifications=True):
    if current.role != "student":
        return await role_workspace(current, full_notifications)
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
        invitations,
    ) = await gather(
        catalog(current, "opportunities", profile),
        catalog(current, "projects", profile),
        catalog(current, "communities", profile),
        catalog(current, "events", profile),
        catalog(current, "mentorship", profile),
        applications(current),
        current.repo.rows(
            "notifications",
            select="*" if full_notifications else "id,read_at,source_module",
            recipient_user_id=f"eq.{current.id}",
            order="created_at.desc",
        ),
        current.repo.rows("mentor_sessions", student_id=f"eq.{current.id}"),
        current.repo.rows("workspace_invitations", recipient_user_id=f"eq.{current.id}"),
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
        "notifications": notifications if full_notifications else [],
        **({"notification_details_loaded": False} if not full_notifications else {}),
        "sessions": sessions,
        "invitations": invitations,
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


async def role_workspace(current, full_notifications=True):
    async def organization_context():
        orgs = await current.repo.rows("organizations", created_by=f"eq.{current.id}")
        extra = {}
        university = next((o for o in orgs if o.get("type") == "university"), None)
        if current.role == "university" and university and university["verified"]:
            progress = await current.repo.rpc(
                "eco_campus_progress", {"p_university": university["id"]}
            )
            extra["students"] = len(progress)
        return orgs, extra

    async def mentor_context():
        return await mentor_reads(current) if current.role == "mentor" else None

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
        organization_data,
        opps,
        projects,
        communities,
        events,
        registrations,
        apps,
        notices,
        sessions,
        activity,
        invitations,
        mentor_hub,
        mentor_data,
    ) = await gather(
        organization_context(),
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
            "notifications", select="*" if full_notifications else "id,read_at,source_module", recipient_user_id=f"eq.{current.id}", order="created_at.desc"
        ),
        current.repo.rows("mentor_sessions", mentor_id=f"eq.{current.id}"),
        current.repo.rows("ecosystem_activity", order="created_at.desc", limit="30"),
        current.repo.rows("workspace_invitations", recipient_user_id=f"eq.{current.id}"),
        optional_hub(current),
        mentor_context(),
    )
    orgs, extra = organization_data
    opps = [o for o in opps if o.get("audience", "student") == "student"]
    for e in events:
        e["member_count"] = sum(r["event_id"] == e["id"] for r in registrations)
    mentor = None
    if current.role == "mentor":
        mentor = mentor_projection(current, mentor_data, projects)
        connections = mentor["connections"]
        extra["connections"] = sum(c["status"] == "accepted" for c in connections)
        extra["requests"] = sum(c["status"] == "requested" for c in connections)
        extra["sessions"] = len(sessions)
    return {
        "profile": profile,
        **({"mentor_hub": mentor_hub} if mentor_hub is not None else {}),
        **({"mentor": mentor} if mentor is not None else {}),
        "organizations": orgs,
        "opportunities": opps,
        "projects": projects,
        "communities": communities,
        "events": events,
        "applications": apps,
        "notifications": notices if full_notifications else [],
        **({"notification_details_loaded": False} if not full_notifications else {}),
        "sessions": sessions,
        "mentors": [],
        "activity": activity,
        "invitations": invitations,
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
