from app.core.errors import APIError


async def hub(current, required=False):
    try:
        result = await current.repo.rpc("eco_mentor_hub", {})
        return {"available": True, **result}
    except APIError as error:
        if error.code != "SCHEMA_REQUIRED" or required:
            raise
        return {"available": False}


async def badges(current, ids):
    if not ids:
        return []
    try:
        return await current.repo.rpc("eco_mentor_badges", {"p_ids": ids})
    except APIError as error:
        if error.code != "SCHEMA_REQUIRED":
            raise
        return None


async def optional_hub(current):
    return await hub(current) if current.role in ("mentor", "company", "university") else None
