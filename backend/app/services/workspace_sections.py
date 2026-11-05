"""Caller-scoped workspace sections. No cross-request or account cache."""
import asyncio
from datetime import datetime, timezone
from app.services.catalog import catalog, applications
from app.services.students import student_core
from app.services.mentors import mentor_reads, mentor_projection
from app.services.mentor_affiliations import optional_hub
from app.services.concurrency import gather

KEYS = {"profile", "opportunities", "applications", "projects", "communities", "events",
        "mentors", "notifications", "sessions", "invitations", "organizations",
        "mentor", "mentor_hub", "activity", "campus_progress", "connections"}


def role_profile(current):
    return {**current.profile, "email": current.email, "email_verified": True,
            "skills": [], "interests": [], "memberships": [],
            "completion": {"percent": 100 if current.profile.get("headline") else 50, "checklist": []}}


class Sections:
    def __init__(self, current, full_notifications=False):
        self.current = current
        self.full_notifications = full_notifications
        self.tasks = {}

    async def get(self, key):
        if key not in self.tasks:
            self.tasks[key] = asyncio.create_task(self.read(key))
        return await self.tasks[key]

    async def close(self):
        for task in self.tasks.values():
            if not task.done():
                task.cancel()
        await asyncio.gather(*self.tasks.values(), return_exceptions=True)

    async def read(self, key):
        c = self.current
        r = c.repo
        student = c.role == "student"
        if key == "profile":
            return await student_core(c) if student else role_profile(c)
        if key in ("projects", "communities", "mentors") or (student and key in ("opportunities", "events")):
            if key == "mentors" and not student:
                return []
            return await catalog(c, "mentorship" if key == "mentors" else key, await self.get("profile"))
        if key == "opportunities":
            return [o for o in await r.rows(key, created_by=f"eq.{c.id}", order="created_at.desc")
                    if o.get("audience", "student") == "student"]
        if key == "applications":
            return await applications(c)
        if key == "events":
            events, registrations = await gather(
                r.rows("events", organizer_id=f"eq.{c.id}", order="starts_at.desc"),
                r.rows("event_registrations", select="event_id"),
            )
            return [{**e, "member_count": sum(x["event_id"] == e["id"] for x in registrations)} for e in events]
        if key == "notifications":
            return await r.rows(key, select="*" if self.full_notifications else "id,read_at,source_module",
                                recipient_user_id=f"eq.{c.id}", order="created_at.desc")
        if key == "sessions":
            return await r.rows("mentor_sessions", **{"student_id" if student else "mentor_id": f"eq.{c.id}"})
        if key == "invitations":
            return await r.rows("workspace_invitations", recipient_user_id=f"eq.{c.id}")
        if key == "organizations":
            return await r.rows(key, created_by=f"eq.{c.id}") if not student else []
        if key == "activity":
            return await r.rows("ecosystem_activity", order="created_at.desc", limit="30") if not student else []
        if key == "mentor_hub":
            return await optional_hub(c)
        if key == "connections":
            return await r.rpc("eco_connections", {})
        if key == "mentor":
            return mentor_projection(c, await mentor_reads(c)) if c.role == "mentor" else None
        if key == "campus_progress":
            orgs = await self.get("organizations")
            org = next((o for o in orgs if o.get("type") == "university"), None)
            return await r.rpc("eco_campus_progress", {"p_university": org["id"]}) if c.role == "university" and org and org["verified"] else []
        raise ValueError("Unknown workspace section")

    async def frame(self, key):
        value = await self.get(key)
        c = self.current
        counts = {}
        unread = {}
        if key in ("projects", "communities"):
            counts[key] = sum(bool(i["joined"]) for i in value)
        elif key == "opportunities":
            counts[key] = sum(not o["applied"] and o["match"]["score"] > 0 for o in value) if c.role == "student" else sum(o["status"] == "published" for o in value)
        elif key == "applications":
            counts[key] = sum(a["status"] not in ("rejected", "withdrawn", "selected") for a in value)
        elif key == "events":
            now = datetime.now(timezone.utc).isoformat()
            counts[key] = sum((e["registered"] if c.role == "student" else e["status"] == "published") and e["ends_at"] > now for e in value)
        elif key == "notifications":
            counts[key] = sum(not n["read_at"] for n in value)
            unread = {m: sum(n["source_module"] == m and not n["read_at"] for n in value)
                      for m in ("opportunities", "applications", "projects", "communities", "events", "mentorship")}
        elif key == "mentor" and value:
            counts.update(connections=sum(c["status"] == "accepted" for c in value["connections"]),
                          requests=sum(c["status"] == "requested" for c in value["connections"]))
        elif key == "sessions" and c.role == "mentor":
            counts[key] = len(value)
        elif key == "campus_progress" and c.role == "university":
            orgs = await self.get("organizations")
            university = next((o for o in orgs if o.get("type") == "university"), None)
            if university and university["verified"]:
                counts["students"] = len(value)
        return {key: [] if key == "notifications" and not self.full_notifications else value,
                **({"notification_details_loaded": self.full_notifications} if key == "notifications" else {}),
                "counts": counts, "module_unread": unread, "ready": key}
