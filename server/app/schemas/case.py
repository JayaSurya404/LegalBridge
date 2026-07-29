"""Case request and response schemas."""

from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.enums import CaseStatus
from app.schemas.base import ORMResponse


class CaseCreate(BaseModel):
    case_number: str = Field(min_length=1, max_length=100)
    title: str = Field(min_length=2, max_length=300)
    description: str | None = Field(default=None, max_length=5000)
    court_name: str | None = Field(default=None, max_length=300)
    jurisdiction: str | None = Field(default=None, max_length=200)
    allegation_type: str | None = Field(default=None, max_length=200)
    status: CaseStatus = CaseStatus.DRAFT
    assigned_attorney_id: str | None = None

    @field_validator(
        "case_number",
        "title",
        "description",
        "court_name",
        "jurisdiction",
        "allegation_type",
    )
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None


class CaseUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=300)
    description: str | None = Field(default=None, max_length=5000)
    court_name: str | None = Field(default=None, max_length=300)
    jurisdiction: str | None = Field(default=None, max_length=200)
    allegation_type: str | None = Field(default=None, max_length=200)
    status: CaseStatus | None = None
    assigned_attorney_id: str | None = None

    @field_validator(
        "title",
        "description",
        "court_name",
        "jurisdiction",
        "allegation_type",
    )
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None


class CaseResponse(ORMResponse):
    id: str
    organization_id: str
    case_number: str
    title: str
    description: str | None
    court_name: str | None
    jurisdiction: str | None
    allegation_type: str | None
    status: CaseStatus
    created_by_id: str
    assigned_attorney_id: str | None
    created_at: datetime
    updated_at: datetime
