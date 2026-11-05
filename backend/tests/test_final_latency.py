"""Credential-free regression tests for progressive, focused workspace reads."""
import asyncio
import json
from types import SimpleNamespace
from uuid import UUID
import pytest
from app.api.routes import spaces, workspace
from app.repositories.workspace_reads import WorkspaceReads
from app.core.errors import APIError
from app.api.dependencies import Actor

ID = "11111111-1111-4111-8111-111111111111"


def actor(repo, role="student"):
    return SimpleNamespace(id="user", email="user@example.test", role=role,
                           profile={"full_name": "Fixture", "primary_role": role}, repo=repo)


def test_project_children_overlap_after_visibility_and_membership():
    async def check():
        started = set()
        ready = asyncio.Event()
        admitted = False

        class Repo:
            async def child(self, name):
                assert admitted
                started.add(name)
                if len(started) == 6:
                    ready.set()
                await ready.wait()
                return {}

            async def rows(self, table, **filters):
                nonlocal admitted
                if table == "projects":
                    return [{"id": ID, "title": "Project"}]
                if table == "project_members":
                    admitted = True
                    assert filters["user_id"] == "eq.user"
                    return [{"role": "project_head"}]
                await self.child(table)
                return []

            async def rpc(self, name, data):
                await self.child(name)
                return {} if name == "eco_relationship_directory" else []

        cores = []
        result = await asyncio.wait_for(spaces.read_detail("projects", UUID(ID), actor(Repo()), cores.append), 2)
        assert cores[0]["joined"] and "tasks" not in cores[0]
        assert result["tasks"] == [] and result["team"] == []
        assert len(started) == 6
    asyncio.run(check())


def test_invisible_entity_never_reads_private_children():
    class Repo:
        async def rows(self, table, **filters):
            assert table == "projects"
            return []
        async def rpc(self, *args):
            pytest.fail("Private RPC called before visibility")
    with pytest.raises(APIError):
        asyncio.run(spaces.detail("projects", UUID(ID), actor(Repo())))


def test_focused_activity_reads_only_joined_visible_tasks():
    calls = []
    class Repo:
        async def rows(self, table, **filters):
            calls.append(table)
            if table == "project_members":
                assert filters == {"user_id": "eq.user", "status": "eq.active"}
                return [{"project_id": ID}]
            if table == "projects":
                assert filters == {"id": f"in.({ID})", "select": "id,title"}
                return [{"id": ID, "title": "Visible"}]
            assert table == "project_tasks" and filters["project_id"] == f"eq.{ID}"
            return [{"id": "task", "assignee_id": "user"}]
        async def rpc(self, *args):
            pytest.fail("Task activity must not load directory or relationship RPCs")
    result = asyncio.run(spaces.activity("projects", actor(Repo()), "tasks"))
    assert result["items"][0]["tasks"][0]["id"] == "task"
    assert calls == ["project_members", "projects", "project_tasks"]


@pytest.mark.parametrize("role", ["mentor", "company", "university", "founder"])
def test_role_stream_matches_full_snapshot_and_emits_profile_first(role):
    async def check():
        class Repo:
            async def rows(self, table, **filters):
                return [{"id": "org", "name": "Campus", "type": "university", "verified": True}] if table == "organizations" else []
            async def rpc(self, name, data):
                return {} if name == "eco_mentor_hub" else []
        current = actor(Repo(), role)
        expected = await workspace.role_workspace(current)
        reads = WorkspaceReads(current.repo)
        response = workspace.progressive_role(actor(reads, role), reads, True)
        stream = response.body_iterator
        merged = json.loads(await anext(stream))
        assert merged["profile"] == expected["profile"]
        assert merged["pending"] and merged["projects"] == []
        async for line in stream:
            frame = json.loads(line)
            assert "error" not in frame
            merged["counts"].update(frame.pop("counts"))
            merged["module_unread"].update(frame.pop("module_unread"))
            frame.pop("ready")
            merged.update(frame)
        for key, value in expected.items():
            assert merged[key] == value, key
    asyncio.run(check())


def test_mentor_core_does_not_wait_for_projects():
    async def check():
        release = asyncio.Event()
        cancelled = asyncio.Event()
        class Repo:
            async def rows(self, table, **filters):
                if table == "projects":
                    try:
                        await release.wait()
                    finally:
                        cancelled.set()
                return []
            async def rpc(self, name, data):
                return {} if name == "eco_mentor_hub" else []
        reads = WorkspaceReads(Repo())
        response = workspace.progressive_role(actor(reads, "mentor"), reads, False)
        stream = response.body_iterator
        await anext(stream)
        while True:
            frame = json.loads(await asyncio.wait_for(anext(stream), 2))
            if frame.get("ready") == "mentor":
                assert frame["mentor"]["connections"] == []
                break
        await stream.aclose()
        assert cancelled.is_set()
    asyncio.run(check())


def test_targeted_event_refresh_does_not_read_unrelated_modules():
    seen = []
    class Repo:
        async def rows(self, table, **filters):
            seen.append(table)
            return []
        async def rpc(self, *args):
            pytest.fail("No RPC is required for an owner's event refresh")
    current = Actor("user", "user@example.test", "company", {"primary_role": "company"}, Repo())
    result = asyncio.run(workspace.workspace_sections(current, "events", False))
    assert result["ready"] == ["events"]
    assert set(seen) == {"events", "event_registrations"}
    assert "profile" not in result and "applications" not in result


def test_selected_mentor_filters_profile_and_connection_reads(monkeypatch):
    from app.services import catalog as service
    seen = []
    async def core(_):
        return {"skills": [], "interests": []}
    async def badges(*_):
        return None
    monkeypatch.setattr(service, "student_core", core)
    monkeypatch.setattr(service, "badges", badges)
    class Repo:
        async def rows(self, table, **filters):
            seen.append((table, filters))
            return []
        async def rpc(self, name, data):
            assert name == "workspace_directory" and data == {"p_kind": "mentors"}
            return []
    assert asyncio.run(service.catalog(actor(Repo()), "mentorship", mentor_id=ID)) == []
    assert ("mentor_profiles", {"user_id": f"eq.{ID}"}) in seen
    assert ("mentor_connections", {"student_id": "eq.user", "mentor_id": f"eq.{ID}"}) in seen
