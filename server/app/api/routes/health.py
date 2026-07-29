"""Honest system health, readiness, and capability endpoints."""

from datetime import datetime, timezone

from fastapi import APIRouter, Request

from app import __version__
from app.core.config import Settings
from app.db.session import Database
from app.schemas.health import (
    CapabilitiesResponse,
    ComponentReadiness,
    HealthResponse,
    ReadinessResponse,
)

router = APIRouter(tags=["system"])


def _settings(request: Request) -> Settings:
    return request.app.state.settings


@router.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    settings = _settings(request)
    return HealthResponse(
        status="ok",
        service=settings.app_name,
        version=__version__,
        environment=settings.environment,
        timestamp=datetime.now(timezone.utc),
    )


@router.get("/ready", response_model=ReadinessResponse)
async def ready(request: Request) -> ReadinessResponse:
    database: Database = request.app.state.database
    database_ready = await database.ping()
    return ReadinessResponse(
        ready=database_ready,
        api=ComponentReadiness(status="ready"),
        database=ComponentReadiness(status="ready" if database_ready else "unavailable"),
        storage=ComponentReadiness(status="not_configured"),
        ai=ComponentReadiness(status="not_configured"),
    )


@router.get("/capabilities", response_model=CapabilitiesResponse)
async def capabilities() -> CapabilitiesResponse:
    return CapabilitiesResponse()
