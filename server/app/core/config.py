"""Environment-backed settings for the Phase 2 API foundation."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

SERVER_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Local API settings with no secret or external-service fields."""

    model_config = SettingsConfigDict(
        env_prefix="LEGALBRIDGE_",
        env_file=SERVER_ROOT / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "LegalBridge India API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    host: str = "127.0.0.1"
    port: int = Field(default=8000, ge=1, le=65535)
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000"],
    )
    log_level: Literal["CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"] = "INFO"
    docs_enabled: bool = True

    @field_validator("api_v1_prefix")
    @classmethod
    def validate_api_prefix(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized.startswith("/"):
            raise ValueError("API_V1_PREFIX must start with '/'.")
        if normalized != "/" and normalized.endswith("/"):
            normalized = normalized.rstrip("/")
        return normalized

    @field_validator("cors_origins")
    @classmethod
    def validate_cors_origins(cls, value: list[str]) -> list[str]:
        return [origin.rstrip("/") for origin in value if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
