"""Concurrent reads with bounded lifetime and unchanged API error propagation."""
import asyncio


async def gather(*operations):
    tasks = [asyncio.ensure_future(operation) for operation in operations]
    try:
        return await asyncio.gather(*tasks)
    except BaseException:
        # Ordinary gather leaves siblings running after one read fails. Cancel
        # and drain them before ending the request or releasing scoped reads.
        for task in tasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        raise
