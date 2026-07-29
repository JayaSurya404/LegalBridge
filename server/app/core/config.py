"""Environment-backed settings for the LegalBridge API."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

SERVER_ROOT = Path(__file__).resolve().parents[2]
DEVELOPMENT_JWT_SECRET = "legalbridge-development-only-secret-change-before-production"


class Settings(BaseSettings):
    """Local API settings with guarded development defaults."""

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
    database_url: str = "sqlite+aiosqlite:///./legalbridge.db"
    sql_echo: bool = False
    access_token_minutes: int = Field(default=15, ge=1, le=60)
    refresh_token_days: int = Field(default=7, ge=1, le=30)
    jwt_algorithm: Literal["HS256"] = "HS256"
    jwt_secret: str = Field(default=DEVELOPMENT_JWT_SECRET, min_length=32)

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

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        normalized = value.strip()
        supported_prefixes = ("sqlite+aiosqlite://", "postgresql+asyncpg://")
        if not normalized.startswith(supported_prefixes):
            raise ValueError("DATABASE_URL must use sqlite+aiosqlite or postgresql+asyncpg.")
        return normalized

    @model_validator(mode="after")
    def reject_development_secret_in_production(self) -> "Settings":
        if (
            self.environment.lower() in {"production", "prod"}
            and self.jwt_secret == DEVELOPMENT_JWT_SECRET
        ):
            raise ValueError("Production mode requires a non-default LEGALBRIDGE_JWT_SECRET.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
