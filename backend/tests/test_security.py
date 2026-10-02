import asyncio
import httpx
import pytest
from fastapi.security import HTTPAuthorizationCredentials
from app.api import dependencies
from app.core.config import Settings
from app.core.errors import APIError
from app.repositories.supabase import SupabaseRepository


def run(coro):
    return asyncio.run(coro)


@pytest.mark.parametrize(
    "verified,state,onboarded,role,expected",
    [
        (True, "active", True, "student", None),
        (False, "active", True, "student", "FORBIDDEN"),
        (True, "suspended", True, "student", "FORBIDDEN"),
        (True, "active", False, "student", "FORBIDDEN"),
        (True, "active", True, "company", "FORBIDDEN"),
    ],
)
def test_authoritative_identity(
    monkeypatch, verified, state, onboarded, role, expected
):
    config = Settings(
        "https://test.invalid", "public-test-key", "http://localhost:3000"
    )
    monkeypatch.setattr(dependencies, "load_settings", lambda: config)
    requests = []

    def respond(request):
        requests.append(request)
        assert request.headers["authorization"] == "Bearer verified-by-supabase"
        if request.url.path == "/auth/v1/user":
            return httpx.Response(
                200,
                json={
                    "id": "student-id",
                    "email": "student@example.test",
                    "email_confirmed_at": "2026-01-01" if verified else None,
                },
            )
        assert request.url.params["id"] == "eq.student-id"
        return httpx.Response(
            200,
            json=[
                {
                    "id": "student-id",
                    "primary_role": role,
                    "account_status": state,
                    "onboarding_completed": onboarded,
                }
            ],
        )

    real_client = httpx.AsyncClient
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kwargs: real_client(transport=httpx.MockTransport(respond), **kwargs),
    )

    async def request():
        identity = await dependencies.actor(
            HTTPAuthorizationCredentials(
                scheme="Bearer", credentials="verified-by-supabase"
            )
        )
        return await dependencies.student(identity)

    if expected:
        with pytest.raises(APIError) as exc:
            run(request())
        assert exc.value.code == expected
    else:
        assert run(request()).id == "student-id"
    assert requests[0].url.path == "/auth/v1/user"


def test_invalid_token_rejected_before_profile(monkeypatch):
    monkeypatch.setattr(
        dependencies,
        "load_settings",
        lambda: Settings("https://test.invalid", "anon", "http://localhost:3000"),
    )
    real_client = httpx.AsyncClient

    def reject(request):
        assert request.url.path == "/auth/v1/user"
        return httpx.Response(401, json={"error": "Invalid token"})

    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kw: real_client(transport=httpx.MockTransport(reject), **kw),
    )
    with pytest.raises(APIError) as exc:
        run(
            dependencies.actor(
                HTTPAuthorizationCredentials(scheme="Bearer", credentials="forged")
            )
        )
    assert exc.value.status == 401


@pytest.mark.parametrize(
    "code,status,expected",
    [
        ("23505", 409, "ALREADY_EXISTS"),
        ("42501", 403, "FORBIDDEN"),
        ("42P01", 404, "SCHEMA_REQUIRED"),
        ("P0001", 400, "ACTION_REJECTED"),
    ],
)
def test_database_errors_never_expose_internals(monkeypatch, code, status, expected):
    real_client = httpx.AsyncClient
    transport = httpx.MockTransport(
        lambda _: httpx.Response(
            status, json={"code": code, "message": "private table and SQL internals"}
        )
    )
    monkeypatch.setattr(
        httpx, "AsyncClient", lambda **kw: real_client(transport=transport, **kw)
    )
    with pytest.raises(APIError) as exc:
        run(
            SupabaseRepository(
                Settings("https://test.invalid", "anon", ""), "test"
            ).rpc("workspace_apply", {})
        )
    assert exc.value.code == expected
    assert "private" not in exc.value.message
