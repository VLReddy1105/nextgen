"""Structural concurrency checks, not machine-speed assertions."""
import asyncio
from types import SimpleNamespace

from app.services.catalog import applications
from app.api.routes.ecosystem import campus
from app.api.routes.workspace import role_workspace


def test_applicant_names_start_with_application_reads():
    async def check():
        names_started = asyncio.Event()

        class Repo:
            async def rows(self, table, **filters):
                await names_started.wait()
                return []

            async def rpc(self, name, data):
                assert name == "eco_applicants"
                names_started.set()
                return []

        assert await asyncio.wait_for(applications(SimpleNamespace(
            role="company", id="owner", repo=Repo())), 2) == []
    asyncio.run(check())


def test_campus_reads_overlap_but_progress_waits_for_owned_verified_org():
    async def check():
        started = set()
        ready = asyncio.Event()
        org_finished = False

        class Repo:
            async def read(self, name):
                started.add(name)
                if len(started) == 6:
                    ready.set()
                await ready.wait()
                return []

            async def rows(self, table, **filters):
                nonlocal org_finished
                await self.read(table)
                if table == "organizations":
                    org_finished = True
                    return [{"id": "campus", "created_by": "owner",
                             "type": "university", "verified": True}]
                return []

            async def rpc(self, name, data):
                if name == "eco_campus_progress":
                    assert org_finished and data == {"p_university": "campus"}
                    return [{"student_id": "student"}]
                return await self.read(name)

        result = await asyncio.wait_for(campus(SimpleNamespace(
            id="owner", role="university", email="owner@example.test", repo=Repo())), 2)
        assert result["progress"] == [{"student_id": "student"}]
        assert len(started) == 6
    asyncio.run(check())


def test_mentor_read_starts_before_catalog_completion():
    async def check():
        connections_started = asyncio.Event()

        class Repo:
            async def rows(self, table, **filters):
                if table == "projects":
                    await connections_started.wait()
                return []

            async def rpc(self, name, data):
                if name == "eco_connections":
                    connections_started.set()
                return {} if name == "eco_mentor_hub" else []

        result = await asyncio.wait_for(role_workspace(SimpleNamespace(
            id="mentor", role="mentor", email="mentor@example.test",
            profile={"full_name": "Mentor"}, repo=Repo())), 2)
        assert result["mentor"]["connections"] == []
        assert result["counts"]["requests"] == 0
    asyncio.run(check())
