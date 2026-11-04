"""Controlled aggregation benchmark; no credentials or network. Not live latency."""
import asyncio
import json
import statistics
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.api.dependencies import Actor
from app.api.routes.workspace import workspace


class Repository:
    def __init__(self):
        self.calls = []

    async def read(self, kind, name, result):
        self.calls.append((kind, name))
        await asyncio.sleep(0.05)
        return result

    async def rows(self, table, **filters):
        return await self.read("REST", table, [
            {"id": "org", "name": "Fixture", "type": "university", "verified": True}
        ] if table == "organizations" else [])

    async def rpc(self, name, data):
        return await self.read("RPC", name, {} if name == "eco_mentor_hub" else [])


async def main():
    results = {}
    for role in ("student", "mentor", "company", "university", "founder"):
        durations = []
        for _ in range(3):
            repo = Repository()
            current = Actor("fixture", "fixture@example.test", role,
                            {"full_name": "Fixture", "primary_role": role}, repo)
            start = time.perf_counter()
            result = await workspace(current)
            durations.append(round((time.perf_counter() - start) * 1000, 2))
        results[role] = {"samples_ms": durations, "median_ms": statistics.median(durations),
                         "calls": len(repo.calls), "rpc": sum(k == "RPC" for k, _ in repo.calls),
                         "bytes": len(json.dumps(result))}
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
