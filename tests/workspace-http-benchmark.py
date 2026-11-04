"""Loopback HTTP benchmark. Synthetic reads, no credentials or hosted database.

The dependency override belongs only to this standalone test app, never the app
used by developers or production. Times exclude real authorization and Supabase.
"""
import asyncio
import json
from pathlib import Path
import socket
import statistics
import sys
import threading
import time

import httpx
import uvicorn
from fastapi import FastAPI

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from app.api.dependencies import Actor, actor
from app.api.routes.workspace import router


class Repository:
    async def rows(self, table, **filters):
        await asyncio.sleep(0.05)
        return []

    async def rpc(self, name, data):
        await asyncio.sleep(0.05)
        return []


async def fixture_actor():
    return Actor("fixture", "fixture@example.test", "student",
                 {"full_name": "Fixture", "primary_role": "student"}, Repository())


async def measure(base):
    results = {"full_ms": [], "profile_frame_ms": [], "stream_complete_ms": []}
    async with httpx.AsyncClient(base_url=base, timeout=10, trust_env=False) as client:
        for _ in range(5):
            started = time.perf_counter()
            full = await client.get("/api/v1/workspace")
            full.raise_for_status()
            results["full_ms"].append(round((time.perf_counter() - started) * 1000, 2))
            started = time.perf_counter()
            frames = []
            async with client.stream("GET", "/api/v1/workspace/progressive") as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not frames:
                        results["profile_frame_ms"].append(round((time.perf_counter() - started) * 1000, 2))
                    frames.append(json.loads(line))
            results["stream_complete_ms"].append(round((time.perf_counter() - started) * 1000, 2))
            assert frames[0]["profile"]["id"] == "fixture"
            assert len(frames) == 10
            assert all("ready" in frame for frame in frames[1:])
    print(json.dumps({"scope": "synthetic-loopback-HTTP-no-auth-no-hosted-access",
                      "samples": results, "median_ms": {k: statistics.median(v) for k, v in results.items()}}, indent=2))


if __name__ == "__main__":
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[actor] = fixture_actor
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        port = listener.getsockname()[1]
        server = uvicorn.Server(uvicorn.Config(app, log_level="error", lifespan="off"))
        thread = threading.Thread(target=server.run, kwargs={"sockets": [listener]}, daemon=True)
        thread.start()
        try:
            deadline = time.monotonic() + 10
            while not server.started:
                if not thread.is_alive() or time.monotonic() > deadline:
                    raise RuntimeError("Local fixture server failed to start")
                time.sleep(0.02)
            asyncio.run(measure(f"http://127.0.0.1:{port}"))
        finally:
            server.should_exit = True
            thread.join(timeout=10)
