"""Persist extraction lifecycle state and organisation-scoped source pages."""

from __future__ import annotations

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.core.config import Settings
from app.db.base import utc_now
from app.models.document import DocumentRecord
from app.models.document_page import DocumentPage
from app.services.audit import add_audit_event
from app.services.extraction import ExtractionResult, extract_document
from app.services.storage import StorageService


def document_audit_metadata(record: DocumentRecord) -> dict[str, str | int]:
    """Return safe metadata without paths, tokens, or extracted text."""

    return {
        "document_id": record.id,
        "original_filename": record.original_filename,
        "category": record.category,
        "size_bytes": record.size_bytes,
        "sha256": record.sha256,
        "extraction_status": record.extraction_status,
        "page_count": record.page_count,
        "character_count": record.extracted_character_count,
        "parser_name": record.parser_name or "not_assigned",
    }


def _final_event(result: ExtractionResult) -> tuple[str, str]:
    if result.status == "processed":
        return "document_extracted", "Document source text extracted and persisted."
    if result.status == "partially_processed":
        return (
            "document_partially_processed",
            "Document source text was partially extracted; review the warnings.",
        )
    if result.status == "ocr_required":
        return (
            "document_ocr_required",
            "Document pages require OCR that is unavailable or disabled.",
        )
    return "document_extraction_failed", "Document source extraction failed."


async def process_document(
    session: AsyncSession,
    *,
    record: DocumentRecord,
    storage: StorageService,
    settings: Settings,
    actor_user_id: str | None,
) -> ExtractionResult:
    """Replace extracted pages and persist a truthful extraction result."""

    if not record.storage_key:
        raise FileNotFoundError("Document has no stored binary.")
    source_path = storage.path_for_key(record.storage_key)
    await session.execute(delete(DocumentPage).where(DocumentPage.document_id == record.id))
    record.extraction_status = "processing"
    record.extraction_error = None
    record.page_count = 0
    record.extracted_character_count = 0
    add_audit_event(
        session,
        organization_id=record.organization_id,
        actor_user_id=actor_user_id,
        event_type="document_extraction_started",
        message="Document source extraction started.",
        entity_type="document_record",
        entity_id=record.id,
        case_id=record.case_id,
        metadata=document_audit_metadata(record),
    )
    await session.commit()

    result = await run_in_threadpool(
        extract_document,
        source_path,
        record.content_type,
        settings,
    )
    for page in result.pages:
        session.add(
            DocumentPage(
                organization_id=record.organization_id,
                case_id=record.case_id,
                document_id=record.id,
                page_number=page.page_number,
                page_label=page.page_label,
                extracted_text=page.extracted_text,
                character_count=page.character_count,
                extraction_method=page.extraction_method,
            )
        )
    record.extraction_status = result.status
    record.parser_name = result.parser_name
    record.parser_version = result.parser_version
    record.page_count = len(result.pages)
    record.extracted_character_count = result.character_count
    record.extraction_error = result.error or (
        " ".join(result.warnings)[:2000] if result.warnings else None
    )
    record.processed_at = utc_now()
    event_type, message = _final_event(result)
    add_audit_event(
        session,
        organization_id=record.organization_id,
        actor_user_id=actor_user_id,
        event_type=event_type,
        message=message,
        entity_type="document_record",
        entity_id=record.id,
        case_id=record.case_id,
        metadata=document_audit_metadata(record),
    )
    await session.commit()
    await session.refresh(record)
    return result
