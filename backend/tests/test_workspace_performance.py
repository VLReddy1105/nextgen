import asyncio
from types import SimpleNamespace
import httpx
from fastapi.security import HTTPAuthorizationCredentials
from app.api import dependencies
from app.core.config import Settings
from app.repositories.supabase import SupabaseRepository
from app.repositories.workspace_reads import WorkspaceReads
from app.main import app


def test_shared_transport_keeps_user_authorization_isolated(monkeypatch):
    config = Settings("https://test.invalid", "public-key", "")
    monkeypatch.setattr(dependencies, "load_settings", lambda: config)
    seen = []

    async def respond(request):
        identity = request.headers["authorization"].split()[-1]
        seen.append((request.url.path, identity))
        await asyncio.sleep(0)
        if request.url.path == "/auth/v1/user":
            return httpx.Response(200, json={"id": identity, "email_confirmed_at": "2026-01-01"})
        assert request.url.params["id"] == f"eq.{identity}"
        return httpx.Response(200, json=[{"id": identity, "primary_role": "student", "account_status": "active", "onboarding_completed": True}])

    async def check():
        async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
            request = SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(supabase_http=client)))
            users = await asyncio.gather(*[
                dependencies.actor(HTTPAuthorizationCredentials(scheme="Bearer", credentials=token), request)
                for token in ("alice", "bob")
            ])
            assert [user.id for user in users] == ["alice", "bob"]
            assert all(user.repo.client is client for user in users)
            assert "authorization" not in client.headers
    asyncio.run(check())
    assert len(seen) == 4  # Both users still have authoritative auth + profile checks.


def test_workspace_read_reuse_is_exact_local_and_copy_safe():
    class Repo:
        calls = 0
        rpc_calls = 0

        async def rows(self, table, **filters):
            self.calls += 1
            await asyncio.sleep(0)
            return [{"id": "row", "tags": []}]

        async def rpc(self, name, data):
            self.rpc_calls += 1
            return []

    async def check():
        repo = Repo()
        reads = WorkspaceReads(repo)
        first, second = await asyncio.gather(reads.rows("projects", limit="500"), reads.rows("projects", limit="500"))
        assert repo.calls == 1
        first[0]["tags"].append("changed")
        assert second[0]["tags"] == []
        await reads.rows("projects", limit="30")
        await reads.rows("projects", limit="500", order="created_at.desc")
        assert repo.calls == 3  # Do not merge differently bounded/ordered reads.
        other_request = WorkspaceReads(repo)
        await other_request.rows("projects", limit="500")
        assert repo.calls == 4
        await reads.rpc("workspace_refresh_reminders", {})
        await reads.rpc("workspace_refresh_reminders", {})
        assert repo.rpc_calls == 2
        await reads.close()
        await other_request.close()
    asyncio.run(check())


def test_lifespan_closes_pool(monkeypatch):
    real_client = httpx.AsyncClient
    clients = []

    def make_client(**kwargs):
        client = real_client(transport=httpx.MockTransport(lambda _: httpx.Response(200, json=[])), **kwargs)
        clients.append(client)
        return client

    monkeypatch.setattr(httpx, "AsyncClient", make_client)

    async def check():
        async with app.router.lifespan_context(app):
            assert app.state.supabase_http is clients[0]
            assert not clients[0].is_closed
        assert clients[0].is_closed
        assert app.state.supabase_http is None
    asyncio.run(check())


def test_pool_repository_preserves_query_bounds():
    async def respond(request):
        assert request.headers["authorization"] == "Bearer student"
        assert request.url.params["select"] == "*"
        assert request.url.params["limit"] == "500"
        return httpx.Response(200, json=[])

    async def check():
        async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as client:
            repo = SupabaseRepository(Settings("https://test.invalid", "public", ""), "student", client=client)
            assert await repo.rows("projects") == []
            assert not client.is_closed
    asyncio.run(check())


def test_failed_parallel_read_cancels_siblings_and_preserves_api_error():
    from app.services.concurrency import gather
    from app.core.errors import APIError
    import pytest

    stopped = []

    async def slow():
        try:
            await asyncio.Event().wait()
        finally:
            stopped.append(True)

    async def fail():
        await asyncio.sleep(0)
        raise APIError("FORBIDDEN", "Not permitted", 403)

    async def check():
        with pytest.raises(APIError) as exc:
            await gather(slow(), fail())
        assert exc.value.status == 403
        assert stopped == [True]
    asyncio.run(check())
