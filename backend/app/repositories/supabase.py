from typing import Protocol, Any
import httpx
from app.core.errors import APIError


class Repository(Protocol):
    async def rows(self, table: str, **filters) -> list[dict[str, Any]]: ...
    async def insert(self, table: str, data: dict) -> dict: ...
    async def update(self, table: str, data: dict, **filters) -> list[dict]: ...
    async def rpc(self, name: str, data: dict) -> Any: ...


class SupabaseRepository:
    def __init__(self, settings, token: str):
        self.url = settings.supabase_url
        self.headers = {
            "apikey": settings.public_key,
            "Authorization": f"Bearer {token}",
        }

    async def request(self, method, path, *, params=None, data=None):
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
                response = await client.request(
                    method,
                    self.url + path,
                    headers={**self.headers, "Prefer": "return=representation"},
                    params=params,
                    json=data,
                )
        except httpx.RequestError:
            raise APIError(
                "SERVICE_UNAVAILABLE",
                "The data service could not be reached. Please retry.",
                503,
            ) from None
        if response.is_error:
            try:
                code = response.json().get("code")
            except ValueError:
                code = None
            if code == "23505":
                raise APIError(
                    "ALREADY_EXISTS", "This action has already been completed.", 409
                )
            if code in ("42P01", "42703", "PGRST202", "PGRST205"):
                raise APIError(
                    "SCHEMA_REQUIRED",
                    "The workspace database migration is not installed. Ask the project maintainer to apply it.",
                    503,
                )
            if response.status_code in (401, 403) or code == "42501":
                raise APIError(
                    "FORBIDDEN", "This action is not permitted for this account.", 403
                )
            raise APIError(
                "ACTION_REJECTED",
                "The action could not be completed. Refresh and check eligibility or permissions.",
                400,
            )
        return response.json() if response.content else None

    async def rows(self, table, **filters):
        return await self.request(
            "GET",
            f"/rest/v1/{table}",
            params={"select": "*", "limit": "500", **filters},
        )

    async def insert(self, table, data):
        result = await self.request("POST", f"/rest/v1/{table}", data=data)
        return result[0]

    async def update(self, table, data, **filters):
        return await self.request(
            "PATCH", f"/rest/v1/{table}", params=filters, data=data
        )

    async def delete(self, table, **filters):
        return await self.request("DELETE", f"/rest/v1/{table}", params=filters)

    async def rpc(self, name, data):
        return await self.request("POST", f"/rest/v1/rpc/{name}", data=data)
