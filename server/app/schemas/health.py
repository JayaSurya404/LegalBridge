"""System endpoint response schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service: str
    version: str
    environment: str
    timestamp: datetime


class ComponentReadiness(BaseModel):
    status: Literal["ready", "unavailable", "not_configured"]


class ReadinessResponse(BaseModel):
    ready: bool
    api: ComponentReadiness
    database: ComponentReadiness
    storage: ComponentReadiness
    ai: ComponentReadiness


class CapabilitiesResponse(BaseModel):
    health_api: Literal["implemented"] = "implemented"
    database_persistence: Literal["implemented"] = "implemented"
    authentication: Literal["implemented"] = "implemented"
    organizations: Literal["implemented"] = "implemented"
    users: Literal["implemented"] = "implemented"
    cases: Literal["implemented"] = "implemented"
    document_metadata: Literal["implemented"] = "implemented"
    audit_events: Literal["implemented"] = "implemented"
    binary_storage: Literal["unavailable"] = "unavailable"
    document_processing: Literal["unavailable"] = "unavailable"
    legal_research: Literal["unavailable"] = "unavailable"
    multi_agent_backend: Literal["unavailable"] = "unavailable"
    multi_agent_execution: Literal["frontend_simulation_only"] = "frontend_simulation_only"
    citation_verification: Literal["frontend_simulation_only"] = "frontend_simulation_only"
    motion_generation: Literal["unavailable"] = "unavailable"
    automatic_court_filing: Literal["prohibited"] = "prohibited"
