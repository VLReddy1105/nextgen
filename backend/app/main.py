import logging
import time
from contextlib import asynccontextmanager
import httpx
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import load_settings
from app.core.errors import APIError
from app.core.logging import configure_logging
from app.api.routes import relationships, ecosystem

configure_logging()

@asynccontextmanager
async def lifespan(app):
    # One transport pool per worker, never shared user credentials or responses.
    async with httpx.AsyncClient(
        timeout=15,
        follow_redirects=False,
        limits=httpx.Limits(max_connections=100, max_keepalive_connections=30),
    ) as client:
        app.state.supabase_http = client
        try:
            yield
        finally:
            app.state.supabase_http = None


app = FastAPI(title="GenZnect Workspace API", version="1.0.0", lifespan=lifespan)
app.include_router(relationships.router)
app.include_router(ecosystem.router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[load_settings().frontend_origin],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.exception_handler(APIError)
async def api_error(request, exc):
    request.state.error_code = exc.code
    return JSONResponse(
        {"error": {"code": exc.code, "message": exc.message, "details": None}},
        status_code=exc.status,
    )


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    return await api_error(
        request,
        APIError("VALIDATION_ERROR", "Check the submitted fields and try again.", 422),
    )


@app.middleware("http")
async def request_log(request: Request, call_next):
    started = time.monotonic()
    try:
        response = await call_next(request)
    except Exception:
        response = await api_error(
            request,
            APIError(
                "INTERNAL_ERROR", "An unexpected error occurred. Please retry.", 500
            ),
        )
    route = request.scope.get("route")
    logging.getLogger("genznect").info(
        "request",
        extra={
            "path": getattr(route, "path", "/unmatched"),
            "status": response.status_code,
            "duration_ms": round((time.monotonic() - started) * 1000),
            "error_code": getattr(request.state, "error_code", None),
        },
    )
    return response


@app.get("/health")
async def health():
    return {"status": "ok"}


from app.api.routes.students import router as students_router

app.include_router(students_router)

from app.api.routes import (
    opportunities,
    applications,
    spaces,
    events,
    notifications,
    mentorship,
    settings,
    workspace,
)

for module in (
    opportunities,
    applications,
    spaces,
    events,
    notifications,
    mentorship,
    settings,
    workspace,
):
    app.include_router(module.router)
