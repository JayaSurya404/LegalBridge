"""Environment-backed settings for the LegalBridge API."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, Field, field_validator, model_validator
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
        populate_by_name=True,
    )

    app_name: str = "LegalBridge India API"
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    host: str = "127.0.0.1"
    port: int = Field(default=8000, ge=1, le=65535)
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
    )
    log_level: Literal["CRITICAL", "ERROR", "WARNING", "INFO", "DEBUG"] = "INFO"
    docs_enabled: bool = True
    database_url: str = Field(
        default="sqlite+aiosqlite:///./legalbridge.db",
        validation_alias=AliasChoices("DATABASE_URL", "LEGALBRIDGE_DATABASE_URL"),
    )
    database_ssl: Literal["disable", "require"] = Field(
        default="disable",
        validation_alias=AliasChoices("DATABASE_SSL", "LEGALBRIDGE_DATABASE_SSL"),
    )
    database_pool_size: int = Field(
        default=5,
        ge=1,
        le=20,
        validation_alias=AliasChoices(
            "DATABASE_POOL_SIZE",
            "LEGALBRIDGE_DATABASE_POOL_SIZE",
        ),
    )
    database_max_overflow: int = Field(
        default=5,
        ge=0,
        le=20,
        validation_alias=AliasChoices(
            "DATABASE_MAX_OVERFLOW",
            "LEGALBRIDGE_DATABASE_MAX_OVERFLOW",
        ),
    )
    database_pool_timeout: int = Field(
        default=30,
        ge=1,
        le=120,
        validation_alias=AliasChoices(
            "DATABASE_POOL_TIMEOUT",
            "LEGALBRIDGE_DATABASE_POOL_TIMEOUT",
        ),
    )
    database_pool_recycle: int = Field(
        default=300,
        ge=30,
        le=3600,
        validation_alias=AliasChoices(
            "DATABASE_POOL_RECYCLE",
            "LEGALBRIDGE_DATABASE_POOL_RECYCLE",
        ),
    )
    sql_echo: bool = False
    access_token_minutes: int = Field(default=15, ge=1, le=60)
    refresh_token_days: int = Field(default=7, ge=1, le=30)
    jwt_algorithm: Literal["HS256"] = "HS256"
    jwt_secret: str = Field(default=DEVELOPMENT_JWT_SECRET, min_length=32)
    storage_root: Path = SERVER_ROOT / "data" / "uploads"
    storage_provider: Literal["local", "supabase"] = Field(
        default="local",
        validation_alias=AliasChoices("STORAGE_PROVIDER", "LEGALBRIDGE_STORAGE_PROVIDER"),
    )
    supabase_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("SUPABASE_URL", "LEGALBRIDGE_SUPABASE_URL"),
    )
    supabase_service_role_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices(
            "SUPABASE_SERVICE_ROLE_KEY",
            "LEGALBRIDGE_SUPABASE_SERVICE_ROLE_KEY",
        ),
    )
    supabase_storage_bucket: str = Field(
        default="legalbridge-documents",
        validation_alias=AliasChoices(
            "SUPABASE_STORAGE_BUCKET",
            "LEGALBRIDGE_SUPABASE_STORAGE_BUCKET",
        ),
    )
    max_upload_bytes: int = Field(default=50 * 1024 * 1024, ge=1)
    ocr_enabled: bool = False
    tesseract_command: str | None = None
    extraction_text_limit: int = Field(default=2_000_000, ge=10_000)
    extraction_page_text_limit: int = Field(default=200_000, ge=1_000)
    extraction_max_pages: int = Field(default=1_000, ge=1, le=10_000)
    analysis_provider: Literal["deterministic", "future_ai"] = "deterministic"
    ai_provider: Literal["deterministic", "gemini"] = Field(
        default="deterministic",
        validation_alias=AliasChoices("AI_PROVIDER", "LEGALBRIDGE_AI_PROVIDER"),
    )
    gemini_api_key: str | None = Field(
        default=None,
        validation_alias=AliasChoices("GEMINI_API_KEY", "LEGALBRIDGE_GEMINI_API_KEY"),
    )
    gemini_model: str = Field(
        default="gemini-2.5-flash",
        validation_alias=AliasChoices("GEMINI_MODEL", "LEGALBRIDGE_GEMINI_MODEL"),
    )
    review_pin: str = Field(default="2026", min_length=4)

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

    @field_validator("storage_root")
    @classmethod
    def normalize_storage_root(cls, value: Path) -> Path:
        return value.expanduser().resolve()

    @field_validator("tesseract_command")
    @classmethod
    def normalize_tesseract_command(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None

    @model_validator(mode="after")
    def reject_development_secret_in_production(self) -> "Settings":
        if (
            self.environment.lower() in {"production", "prod"}
            and self.jwt_secret == DEVELOPMENT_JWT_SECRET
        ):
            raise ValueError("Production mode requires a non-default LEGALBRIDGE_JWT_SECRET.")
        if self.database_url.startswith("postgresql+asyncpg://"):
            if self.database_ssl != "require":
                raise ValueError("PostgreSQL connections require DATABASE_SSL=require.")
        elif self.database_ssl != "disable":
            raise ValueError("SQLite connections require DATABASE_SSL=disable.")
        if self.storage_provider == "supabase" and (
            not self.supabase_url or not self.supabase_service_role_key
        ):
            raise ValueError(
                "Supabase storage requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
            )
        if self.ai_provider == "gemini" and not self.gemini_api_key:
            raise ValueError("Gemini requires GEMINI_API_KEY.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
