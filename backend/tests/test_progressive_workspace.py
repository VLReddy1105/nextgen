import asyncio
import json
from app.api.dependencies import Actor
from app.api.routes import workspace as routes


class Repo:
    def __init__(self):
        self.calls = []

    async def rows(self, table, **filters):
        self.calls.append((table, filters))
        if table == "notifications":
            notice = {"id": "notice", "read_at": None, "source_module": "projects",
                      "title": "A project update", "action_url": "/dashboard/projects"}
            return [{key: notice[key] for key in filters["select"].split(",")}] if filters.get("select", "*") != "*" else [notice]
        return []

    async def rpc(self, name, data):
        self.calls.append((name, data))
        return {} if name == "eco_mentor_hub" else []


def actor(repo):
    return Actor("student", "student@example.test", "student",
                 {"full_name": "Student", "primary_role": "student"}, repo)


def merge(parts):
    result = parts[0]
    for part in parts[1:]:
        ready = part.pop("ready")
        result["pending"].remove(ready)
        counts = {**result["counts"], **part.pop("counts")}
        unread = {**result["module_unread"], **part.pop("module_unread")}
        result.update(part)
        result.update(counts=counts, module_unread=unread)
    result.pop("pending")
    result.pop("notification_details_loaded")
    return result


def test_progressive_full_contract_matches_existing_workspace():
    async def check():
        expected = await routes.workspace(actor(Repo()))
        response = await routes.progressive_workspace(actor(Repo()), True)
        parts = [json.loads(part) async for part in response.body_iterator]
        assert merge(parts) == expected
    asyncio.run(check())


def test_profile_and_projects_do_not_wait_for_mentorship(monkeypatch):
    async def check():
        release = asyncio.Event()
        original = routes.catalog
        async def catalog(current, kind, profile):
            if kind == "mentorship":
                await release.wait()
            return await original(current, kind, profile)
        monkeypatch.setattr(routes, "catalog", catalog)
        repo = Repo()
        response = await routes.progressive_workspace(actor(repo))
        assert any(name == "workspace_refresh_reminders" for name, _ in repo.calls)
        stream = response.body_iterator
        initial = json.loads(await anext(stream))
        assert initial["profile"]["id"] == "student"
        assert "mentors" in initial["pending"]
        ready = []
        while "projects" not in ready:
            part = json.loads(await asyncio.wait_for(anext(stream), 2))
            ready.append(part["ready"])
        assert "mentors" not in ready
        release.set()
        parts = [json.loads(part) async for part in stream]
        assert any(p.get("ready") == "mentors" for p in parts)
        assert next(f for t, f in repo.calls if t == "notifications")["select"] == "id,read_at,source_module"
    asyncio.run(check())


def test_summary_preserves_unread_semantics_without_details():
    async def check():
        for role in ("student", "mentor", "company", "university", "founder"):
            current = actor(Repo())
            current.role = role
            full = await routes.workspace(current)
            summary = await routes.workspace(current, False)
            assert summary["counts"] == full["counts"]
            assert summary["module_unread"] == full["module_unread"]
            assert summary["notifications"] == []
            assert summary["notification_details_loaded"] is False
    asyncio.run(check())


def test_disconnect_cancels_obsolete_reads_after_reminder_finishes(monkeypatch):
    async def check():
        started, cancelled = asyncio.Event(), asyncio.Event()
        original = routes.catalog
        async def catalog(current, kind, profile):
            if kind == "mentorship":
                started.set()
                try:
                    await asyncio.Event().wait()
                finally:
                    cancelled.set()
            return await original(current, kind, profile)
        monkeypatch.setattr(routes, "catalog", catalog)
        repo = Repo()
        response = await routes.progressive_workspace(actor(repo))
        assert sum(name == "workspace_refresh_reminders" for name, _ in repo.calls) == 1
        stream = response.body_iterator
        await anext(stream)
        await anext(stream)
        await started.wait()
        await stream.aclose()
        assert cancelled.is_set()
    asyncio.run(check())


def test_read_failure_is_explicit_and_does_not_disclose_exception(monkeypatch):
    async def check():
        async def fail(*args):
            raise ValueError("private upstream detail")
        monkeypatch.setattr(routes, "applications", fail)
        response = await routes.progressive_workspace(actor(Repo()))
        parts = [json.loads(part) async for part in response.body_iterator]
        assert parts[-1]["error"] == "Could not finish loading workspace. Please retry."
        assert "private upstream detail" not in json.dumps(parts)
    asyncio.run(check())
