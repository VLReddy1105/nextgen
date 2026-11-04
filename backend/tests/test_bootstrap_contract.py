"""Exercise real HTTP routes + admission with a synthetic Supabase transport."""
import asyncio
import json
import httpx
import pytest
from app.main import app
from app.api import dependencies
from app.core.config import Settings


@pytest.mark.parametrize("role", ["student", "mentor", "company", "university", "founder"])
def test_authorized_bootstrap_contract(monkeypatch, role):
    monkeypatch.setattr(dependencies, "load_settings", lambda: Settings("https://fixture.invalid", "fixture-public", ""))
    seen = []
    async def respond(request):
        seen.append(request.url.path)
        assert request.headers["authorization"] == "Bearer fixture-session"
        if request.url.path == "/auth/v1/user":
            return httpx.Response(200, json={"id": "fixture", "email": "fixture@example.test", "email_confirmed_at": "2026-01-01"})
        if request.url.path == "/rest/v1/profiles":
            return httpx.Response(200, json=[{"id": "fixture", "full_name": "Fixture", "primary_role": role,
                                             "account_status": "active", "onboarding_completed": True}])
        return httpx.Response(200, json={} if request.url.path.endswith("eco_mentor_hub") else [])

    async def check():
        async with httpx.AsyncClient(transport=httpx.MockTransport(respond)) as upstream:
            monkeypatch.setattr(app.state, "supabase_http", upstream, raising=False)
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
                path = "/api/v1/workspace/progressive" if role == "student" else "/api/v1/workspace?full_notifications=false"
                response = await client.get(path, headers={"Authorization": "Bearer fixture-session"})
                assert response.status_code == 200, response.text
                if role == "student":
                    frames = [json.loads(line) for line in response.text.splitlines()]
                    result = frames[0]
                    assert len(frames) == 10
                    assert not any("error" in frame for frame in frames)
                else:
                    result = response.json()
                assert result["profile"]["id"] == "fixture"
                assert result["profile"]["primary_role"] == role
                assert "counts" in result and "opportunities" in result
    asyncio.run(check())
    assert seen.count("/auth/v1/user") == 1
    assert seen.count("/rest/v1/profiles") == 1


def test_expired_bootstrap_is_401_not_success_or_missing_route(monkeypatch):
    monkeypatch.setattr(dependencies, "load_settings", lambda: Settings("https://fixture.invalid", "fixture-public", ""))
    async def check():
        async with httpx.AsyncClient(transport=httpx.MockTransport(lambda _: httpx.Response(401, json={}))) as upstream:
            monkeypatch.setattr(app.state, "supabase_http", upstream, raising=False)
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
                for path in ("/api/v1/workspace/progressive", "/api/v1/workspace?full_notifications=false"):
                    response = await client.get(path, headers={"Authorization": "Bearer expired-fixture"})
                    assert response.status_code == 401
                    assert response.json()["error"]["code"] == "UNAUTHENTICATED"
    asyncio.run(check())
