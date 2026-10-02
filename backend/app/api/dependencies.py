from dataclasses import dataclass
from typing import Annotated
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import httpx
from app.core.config import load_settings
from app.core.errors import APIError, require
from app.repositories.supabase import SupabaseRepository

bearer = HTTPBearer(auto_error=False)


@dataclass
class Actor:
    id: str
    email: str
    role: str
    profile: dict
    repo: SupabaseRepository


async def actor(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
):
    if credentials is None:
        raise APIError("UNAUTHENTICATED", "Sign in to continue.", 401)
    config = load_settings()
    if not config.supabase_url or not config.public_key:
        raise APIError(
            "CONFIG_MISSING", "The authentication service is not configured.", 503
        )
    repo = SupabaseRepository(config, credentials.credentials)
    # Supabase verifies the token; never trust decoded unsigned claims or browser role.
    try:
        async with httpx.AsyncClient(timeout=10, follow_redirects=False) as client:
            response = await client.get(
                config.supabase_url + "/auth/v1/user", headers=repo.headers
            )
    except httpx.RequestError:
        raise APIError(
            "AUTH_UNAVAILABLE", "Authentication is temporarily unavailable.", 503
        ) from None
    if response.status_code >= 500:
        raise APIError(
            "AUTH_UNAVAILABLE", "Authentication is temporarily unavailable.", 503
        )
    if response.status_code != 200:
        raise APIError(
            "UNAUTHENTICATED", "Your session has expired. Sign in again.", 401
        )
    user = response.json()
    require(
        bool(user.get("email_confirmed_at")), "Verify your email before continuing."
    )
    profiles = await repo.rows("profiles", id=f'eq.{user["id"]}')
    require(bool(profiles), "Your account profile is unavailable.")
    profile = profiles[0]
    require(profile["account_status"] == "active", "An active account is required.")
    require(profile["onboarding_completed"], "Complete account setup first.")
    require(
        profile.get("primary_role")
        in ("student", "founder", "company", "university", "mentor")
    )
    return Actor(
        user["id"], user.get("email", ""), profile["primary_role"], profile, repo
    )


async def student(current: Annotated[Actor, Depends(actor)]):
    require(current.role == "student", "A Student account is required.")
    return current


Current = Annotated[Actor, Depends(actor)]
Student = Annotated[Actor, Depends(student)]
