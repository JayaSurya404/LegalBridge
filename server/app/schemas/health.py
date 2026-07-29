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
    status: Literal["ready", "not_configured"]


class ReadinessResponse(BaseModel):
    ready: Literal[True]
    api: ComponentReadiness
    database: ComponentReadiness
    storage: ComponentReadiness
    ai: ComponentReadiness


class CapabilitiesResponse(BaseModel):
    health_api: Literal["implemented"] = "implemented"
    document_processing: Literal["unavailable"] = "unavailable"
    legal_research: Literal["unavailable"] = "unavailable"
    multi_agent_execution: Literal["frontend_simulation_only"] = "frontend_simulation_only"
    citation_verification: Literal["frontend_simulation_only"] = "frontend_simulation_only"
    automatic_court_filing: Literal["prohibited"] = "prohibited"
