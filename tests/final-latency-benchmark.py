"""Compare HEAD with working-tree read scheduling. Fake I/O only; no credentials."""
import asyncio
import json
import statistics
import subprocess
import sys
import time
import types
from pathlib import Path
from uuid import UUID

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
from app.api.routes import spaces, applications, opportunities, events, workspace
from app.api.dependencies import Actor
from app.repositories.workspace_reads import WorkspaceReads

ID = "11111111-1111-4111-8111-111111111111"


class Repo:
    def __init__(self, kind="role"):
        self.kind, self.calls = kind, []

    async def rows(self, table, **filters):
        self.calls.append(table)
        await asyncio.sleep(.05)
        if table == "organizations":
            return [{"id": ID, "name": "Fixture", "type": "university", "verified": True}]
        if self.kind == "role":
            return []
        if table == self.kind:
            return [{"id": ID, "title": "Fixture", "name": "Fixture", "organization_id": ID,
                     "opportunity_id": ID, "organizer_id": "user", "student_id": "user", "created_by": "user"}]
        if table == "opportunities" and self.kind == "applications":
            return [{"id": ID, "organization_id": ID, "title": "Fixture", "created_by": "user"}]
        if table in ("project_members", "community_members"):
            return [{"role": "project_head" if table == "project_members" else "member"}]
        if table == "community_posts":
            return [{"id": ID}]
        return []

    async def rpc(self, name, data):
        self.calls.append(name)
        await asyncio.sleep(.05)
        return {} if name in ("eco_relationship_directory", "eco_mentor_hub", "eco_applicant_summary") else []


def baseline(name):
    source = subprocess.check_output(["git", "show", f"HEAD:backend/app/api/routes/{name}.py"], cwd=ROOT, text=True)
    module = types.ModuleType(f"baseline_{name}")
    exec(compile(source, f"HEAD/{name}.py", "exec"), module.__dict__)
    return module


def actor(repo, role="student"):
    return Actor("user", "fixture@example.test", role, {"full_name": "Fixture", "primary_role": role}, repo)


async def main():
    output = {"conditions": "3 detail samples, 1 role sample, 50ms artificial per upstream operation; excludes Auth, network and browser", "details": {}, "roles": {}}
    for kind, module, filename in [("projects", spaces, "spaces"), ("communities", spaces, "spaces"),
                                   ("applications", applications, "applications"), ("opportunities", opportunities, "opportunities"), ("events", events, "events")]:
        output["details"][kind] = {}
        for label, route in [("before", baseline(filename).detail), ("after", module.detail)]:
            samples = []
            for _ in range(3):
                repo = Repo(kind)
                start = time.perf_counter()
                args = (kind, UUID(ID), actor(repo)) if kind in ("projects", "communities") else (UUID(ID), actor(repo))
                await route(*args)
                samples.append(round((time.perf_counter() - start) * 1000, 2))
            output["details"][kind][label] = {"median_ms": statistics.median(samples), "upstream_calls": len(repo.calls)}
    for role in ("mentor", "company", "university", "founder"):
        old_workspace = baseline("workspace")
        repo = Repo()
        start = time.perf_counter()
        await old_workspace.role_workspace(actor(repo, role))
        before = round((time.perf_counter() - start) * 1000, 2)
        repo = Repo(); reads = WorkspaceReads(repo)
        response = workspace.progressive_role(actor(reads, role), reads, False)
        start = time.perf_counter()
        stream = response.body_iterator
        await anext(stream)
        first = round((time.perf_counter() - start) * 1000, 2)
        ready = {}
        async for line in stream:
            frame = json.loads(line)
            ready[frame.get("ready", "error")] = round((time.perf_counter() - start) * 1000, 2)
        output["roles"][role] = {"before_full_ms": before, "after_profile_ms": first, "after_sections_ms": ready, "upstream_calls": len(repo.calls)}
    print(json.dumps(output, indent=2))

asyncio.run(main())
