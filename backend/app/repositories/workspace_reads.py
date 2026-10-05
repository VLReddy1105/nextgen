"""Deduplicate identical reads within ONE workspace aggregation only."""
import asyncio
from copy import deepcopy


class WorkspaceReads:
    def __init__(self, repo):
        self.repo = repo
        self.reads = {}

    async def rows(self, table, **filters):
        key = (table, tuple(sorted(filters.items())))
        if key not in self.reads:
            self.reads[key] = asyncio.create_task(self.repo.rows(table, **filters))
        # Consumers enrich rows in place; never let one module alter another.
        return deepcopy(await self.reads[key])

    async def rpc(self, name, data):
        # RPCs may have side effects; never cache them.
        return await self.repo.rpc(name, data)

    async def close(self):
        for task in self.reads.values():
            if not task.done():
                task.cancel()
        await asyncio.gather(*self.reads.values(), return_exceptions=True)
