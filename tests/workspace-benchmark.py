"""Offline endpoint benchmark: fixed 50ms PostgREST latency, no credentials/network.

Run with the backend Python runtime: python tests/workspace-benchmark.py LABEL
Results go to ignored work/performance. This is not a live Supabase timing.
"""
import asyncio
import json
import sys
import time
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
import httpx
from app.api.dependencies import Actor, actor
from app.core.config import Settings
from app.main import app
from app.repositories.supabase import SupabaseRepository

TABLES = {
    "student_details": [{"skills": ["python"], "interests": []}],
    "organizations": [{"id": "org", "name": "Example", "verified": True}],
    "opportunities": [{"id": "opp", "organization_id": "org", "title": "Python", "status": "published", "tags": ["python"]}],
    "applications": [{"id": "app", "opportunity_id": "opp", "status": "applied"}],
    "projects": [{"id": "project", "title": "Project"}],
    "project_members": [{"project_id": "project"}],
    "communities": [{"id": "community", "name": "Community"}],
    "community_members": [{"community_id": "community"}],
    "events": [{"id": "event", "status": "published", "ends_at": "2099-01-01"}],
    "event_registrations": [{"event_id": "event"}],
}


async def main():
    output = {}
    real_client = httpx.AsyncClient
    # Measure the actual local TLS/client setup cost separately from fake I/O.
    started = time.perf_counter()
    async with real_client():
        pass
    output["http_client_setup_ms"] = round((time.perf_counter() - started) * 1000, 2)
    for role in ("student", "company", "university", "mentor"):
        calls = []
        clients = []

        async def respond(request):
            calls.append(str(request.url.path) + "?" + str(request.url.query, "utf8"))
            await asyncio.sleep(0.05)
            return httpx.Response(200, json=TABLES.get(request.url.path.split("/")[-1], []))

        def make_client(**kwargs):
            clients.append(1)
            return real_client(transport=httpx.MockTransport(respond), **kwargs)

        with patch("httpx.AsyncClient", make_client):
            # Run lifespan so the optimized app can own/close its HTTP pool.
            async with app.router.lifespan_context(app):
                shared = getattr(app.state, "supabase_http", None)
                repo = (SupabaseRepository(Settings("https://test.invalid", "public", ""), "fixture", client=shared)
                        if shared else SupabaseRepository(Settings("https://test.invalid", "public", ""), "fixture"))
                app.dependency_overrides[actor] = lambda: Actor("user", "fixture@example.test", role, {"full_name": "Fixture", "primary_role": role}, repo)
                try:
                    async with real_client(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
                        started = time.perf_counter()
                        response = await client.get("/api/v1/workspace")
                        elapsed = (time.perf_counter() - started) * 1000
                        assert response.status_code == 200, response.text
                finally:
                    app.dependency_overrides.clear()
        output[role] = {"endpoint_ms": round(elapsed, 2), "supabase_calls": len(calls), "http_clients": len(clients), "calls": calls, "response": response.json()}
    folder = ROOT / "work/performance"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / f"{sys.argv[1]}.json").write_text(json.dumps(output, indent=2), encoding="utf8")
    print(json.dumps({key: ({k: v for k, v in value.items() if k not in ("calls", "response")} if isinstance(value, dict) else value) for key, value in output.items()}, indent=2))


asyncio.run(main())
