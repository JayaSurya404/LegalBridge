"""Document metadata, extraction lifecycle, and source-page schemas."""

from datetime import datetime
from pathlib import PurePath
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.document import MAX_DOCUMENT_BYTES
from app.schemas.base import ORMResponse

ALLOWED_DOCUMENT_TYPES = {
    "application/pdf": ".pdf",
    "text/plain": ".txt",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}


class DocumentMetadataCreate(BaseModel):
    original_filename: str = Field(min_length=1, max_length=255)
    content_type: str
    size_bytes: int = Field(gt=0, le=MAX_DOCUMENT_BYTES)
    sha256: str = Field(pattern=r"^[0-9a-fA-F]{64}$")
    category: str = Field(min_length=1, max_length=100)

    @field_validator("original_filename")
    @classmethod
    def validate_filename(cls, value: str) -> str:
        normalized = value.strip()
        if (
            "/" in normalized
            or "\\" in normalized
            or PurePath(normalized).name != normalized
            or normalized in {".", ".."}
        ):
            raise ValueError("Filename must not contain a path.")
        return normalized

    @field_validator("content_type")
    @classmethod
    def validate_content_type(cls, value: str) -> str:
        normalized = value.strip().lower()
        if normalized not in ALLOWED_DOCUMENT_TYPES:
            raise ValueError("Only PDF, TXT, and DOCX metadata is accepted.")
        return normalized

    @field_validator("sha256")
    @classmethod
    def normalize_sha256(cls, value: str) -> str:
        return value.lower()

    @field_validator("category")
    @classmethod
    def normalize_category(cls, value: str) -> str:
        return value.strip()

    @model_validator(mode="after")
    def validate_extension(self) -> "DocumentMetadataCreate":
        required_extension = ALLOWED_DOCUMENT_TYPES[self.content_type]
        if not self.original_filename.lower().endswith(required_extension):
            raise ValueError(f"Filename extension must match {required_extension} content.")
        return self


DocumentExtractionStatus = Literal[
    "metadata_only",
    "uploaded",
    "processing",
    "processed",
    "partially_processed",
    "ocr_required",
    "failed",
]


class DocumentPageResponse(ORMResponse):
    id: str
    organization_id: str
    case_id: str
    document_id: str
    page_number: int
    page_label: str
    extracted_text: str
    character_count: int
    extraction_method: str
    created_at: datetime
    updated_at: datetime


class DocumentSummaryResponse(ORMResponse):
    id: str
    organization_id: str
    case_id: str
    original_filename: str
    content_type: str
    size_bytes: int
    sha256: str
    category: str
    status: Literal["metadata_only"]
    extraction_status: DocumentExtractionStatus
    parser_name: str | None
    parser_version: str | None
    page_count: int
    extracted_character_count: int
    extraction_error: str | None
    processed_at: datetime | None
    original_uploaded_at: datetime | None
    binary_exists: bool
    created_by_id: str
    created_at: datetime
    updated_at: datetime


class DocumentDetailResponse(DocumentSummaryResponse):
    pages: list[DocumentPageResponse]


# Backward-compatible name used by the Phase 3 metadata route and tests.
DocumentMetadataResponse = DocumentSummaryResponse
