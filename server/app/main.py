"""FastAPI application factory for the LegalBridge India foundation."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from time import perf_counter
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import Response

from app import __version__
from app.api.router import api_router
from app.core.config import Settings, get_settings
from app.core.errors import register_exception_handlers, unexpected_error_response
from app.core.logging import configure_logging
from app.db.session import Database
from app.schemas.common import RootServiceResponse

LOGGER = logging.getLogger("legalbridge.api")
LEGAL_DISCLAIMER = (
    "Attorney-assistance hackathon prototype. Not an official government service, "
    "not legal advice, and not authorised for automatic court filing."
)


def _request_id(request: Request) -> str:
    candidate = request.headers.get("X-Request-ID", "").strip()
    allowed = set("-_.:")
    if (
        candidate
        and len(candidate) <= 128
        and all(character.isalnum() or character in allowed for character in candidate)
    ):
        return candidate
    return str(uuid4())


def create_app(settings: Settings | None = None) -> FastAPI:
    """Create the configured API without creating or migrating database tables."""

    app_settings = settings or get_settings()
    configure_logging(app_settings.log_level)
    database = Database(app_settings.database_url, echo=app_settings.sql_echo)

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        del application
        yield
        await database.dispose()

    docs_url = "/docs" if app_settings.docs_enabled else None
    redoc_url = "/redoc" if app_settings.docs_enabled else None
    openapi_url = "/openapi.json" if app_settings.docs_enabled else None

    application = FastAPI(
        title=app_settings.app_name,
        version=__version__,
        description=LEGAL_DISCLAIMER,
        docs_url=docs_url,
        redoc_url=redoc_url,
        openapi_url=openapi_url,
        lifespan=lifespan,
    )
    application.state.settings = app_settings
    application.state.database = database

    application.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Process-Time-Ms"],
    )
    register_exception_handlers(application)

    @application.middleware("http")
    async def add_request_metadata(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        request_id = _request_id(request)
        request.state.request_id = request_id
        started_at = perf_counter()

        try:
            response = await call_next(request)
        except Exception:
            LOGGER.exception(
                "unexpected_request_error request_id=%s method=%s path=%s",
                request_id,
                request.method,
                request.url.path,
            )
            response = unexpected_error_response(request)

        process_time_ms = (perf_counter() - started_at) * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Process-Time-Ms"] = f"{process_time_ms:.3f}"
        LOGGER.info(
            "request_complete request_id=%s method=%s path=%s status=%s process_time_ms=%.3f",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            process_time_ms,
        )
        return response

    @application.get("/", response_model=RootServiceResponse, tags=["system"])
    async def service_metadata() -> RootServiceResponse:
        return RootServiceResponse(
            service=app_settings.app_name,
            version=__version__,
            environment=app_settings.environment,
            api_prefix=app_settings.api_v1_prefix,
            documentation_url=docs_url,
            legal_disclaimer=LEGAL_DISCLAIMER,
        )

    application.include_router(api_router, prefix=app_settings.api_v1_prefix)
    return application


app = create_app()
