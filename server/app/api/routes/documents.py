"""Organisation-isolated document metadata, binary, and source-page routes."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Request, Response, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import Principal, get_current_principal, require_roles
from app.api.routes.cases import get_organization_case
from app.core.config import Settings
from app.core.errors import ApplicationError
from app.db.base import new_uuid, utc_now
from app.db.session import get_session
from app.models.document import DocumentRecord
from app.models.document_page import DocumentPage
from app.models.enums import UserRole
from app.schemas.document import (
    DocumentDetailResponse,
    DocumentMetadataCreate,
    DocumentSummaryResponse,
)
from app.services.audit import add_audit_event
from app.services.document_processing import (
    document_audit_metadata,
    process_document,
)
from app.services.storage import (
    DocumentValidationError,
    StorageService,
)

router = APIRouter(prefix="/cases/{case_id}/documents", tags=["documents"])
document_editor = require_roles(UserRole.ADMIN, UserRole.ATTORNEY)


def _storage(request: Request) -> StorageService:
    settings: Settings = request.app.state.settings
    return StorageService(settings.storage_root, settings.max_upload_bytes)


async def _get_document(
    session: AsyncSession,
    *,
    organization_id: str,
    case_id: str,
    document_id: str,
) -> DocumentRecord:
    statement = select(DocumentRecord).where(
        DocumentRecord.id == document_id,
        DocumentRecord.organization_id == organization_id,
        DocumentRecord.case_id == case_id,
    )
    record = (await session.scalars(statement)).one_or_none()
    if record is None:
        raise ApplicationError(
            status_code=404,
            code="document_not_found",
            message="Document not found.",
        )
    return record


def _summary(
    record: DocumentRecord,
    storage: StorageService,
) -> DocumentSummaryResponse:
    return DocumentSummaryResponse(
        id=record.id,
        organization_id=record.organization_id,
        case_id=record.case_id,
        original_filename=record.original_filename,
        content_type=record.content_type,
        size_bytes=record.size_bytes,
        sha256=record.sha256,
        category=record.category,
        status="metadata_only",
        extraction_status=record.extraction_status,
        parser_name=record.parser_name,
        parser_version=record.parser_version,
        page_count=record.page_count,
        extracted_character_count=record.extracted_character_count,
        extraction_error=record.extraction_error,
        processed_at=record.processed_at,
        original_uploaded_at=record.original_uploaded_at,
        binary_exists=storage.binary_exists(record.storage_key),
        created_by_id=record.created_by_id,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


async def _detail(
    session: AsyncSession,
    record: DocumentRecord,
    storage: StorageService,
) -> DocumentDetailResponse:
    pages = list(
        (
            await session.scalars(
                select(DocumentPage)
                .where(
                    DocumentPage.organization_id == record.organization_id,
                    DocumentPage.case_id == record.case_id,
                    DocumentPage.document_id == record.id,
                )
                .order_by(DocumentPage.page_number)
            )
        ).all()
    )
    return DocumentDetailResponse(
        **_summary(record, storage).model_dump(),
        pages=pages,
    )


async def _record_validation_failure(
    session: AsyncSession,
    *,
    principal: Principal,
    case_id: str,
    document_id: str,
    code: str,
    declared_content_type: str | None,
) -> None:
    add_audit_event(
        session,
        organization_id=principal.organization.id,
        actor_user_id=principal.user.id,
        event_type="document_validation_failed",
        message="Document upload validation failed.",
        entity_type="document_record",
        entity_id=document_id,
        case_id=case_id,
        metadata={
            "document_id": document_id,
            "reason_code": code,
            "declared_content_type": declared_content_type or "missing",
        },
    )
    await session.commit()


@router.get("", response_model=list[DocumentSummaryResponse])
async def list_documents(
    case_id: str,
    request: Request,
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[DocumentSummaryResponse]:
    await get_organization_case(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
    )
    records = list(
        (
            await session.scalars(
                select(DocumentRecord)
                .where(
                    DocumentRecord.organization_id == principal.organization.id,
                    DocumentRecord.case_id == case_id,
                )
                .order_by(DocumentRecord.created_at.desc())
            )
        ).all()
    )
    storage = _storage(request)
    return [_summary(record, storage) for record in records]


@router.post(
    "",
    response_model=DocumentSummaryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_document_metadata(
    case_id: str,
    payload: DocumentMetadataCreate,
    request: Request,
    principal: Annotated[Principal, Depends(document_editor)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DocumentSummaryResponse:
    """Preserve the Phase 3 metadata-only contract for compatible clients."""

    await get_organization_case(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
    )
    duplicate = await session.scalar(
        select(DocumentRecord.id).where(
            DocumentRecord.case_id == case_id,
            DocumentRecord.sha256 == payload.sha256,
        )
    )
    if duplicate is not None:
        raise ApplicationError(
            status_code=409,
            code="duplicate_document_sha256",
            message="Document metadata with this SHA-256 already exists for the case.",
        )

    record = DocumentRecord(
        organization_id=principal.organization.id,
        case_id=case_id,
        original_filename=payload.original_filename,
        content_type=payload.content_type,
        size_bytes=payload.size_bytes,
        sha256=payload.sha256,
        category=payload.category,
        status="metadata_only",
        extraction_status="metadata_only",
        created_by_id=principal.user.id,
    )
    session.add(record)
    try:
        await session.flush()
    except IntegrityError as exc:
        await session.rollback()
        raise ApplicationError(
            status_code=409,
            code="duplicate_document_sha256",
            message="Document metadata with this SHA-256 already exists for the case.",
        ) from exc

    add_audit_event(
        session,
        organization_id=principal.organization.id,
        actor_user_id=principal.user.id,
        event_type="document_metadata_creation",
        message="Document metadata created; no binary content was accepted.",
        entity_type="document_record",
        entity_id=record.id,
        case_id=case_id,
        metadata={"filename": record.original_filename},
    )
    await session.commit()
    await session.refresh(record)
    return _summary(record, _storage(request))


@router.post(
    "/upload",
    response_model=DocumentDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_document(
    case_id: str,
    request: Request,
    file: Annotated[UploadFile, File()],
    category: Annotated[str, Form(min_length=1, max_length=100)],
    principal: Annotated[Principal, Depends(document_editor)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DocumentDetailResponse:
    await get_organization_case(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
    )
    normalized_category = category.strip()
    if not normalized_category:
        raise ApplicationError(
            status_code=422,
            code="invalid_category",
            message="Document category must not be blank.",
        )

    document_id = new_uuid()
    add_audit_event(
        session,
        organization_id=principal.organization.id,
        actor_user_id=principal.user.id,
        event_type="document_upload_started",
        message="Document upload started.",
        entity_type="document_record",
        entity_id=document_id,
        case_id=case_id,
        metadata={
            "document_id": document_id,
            "category": normalized_category,
            "declared_content_type": file.content_type or "missing",
        },
    )
    await session.commit()

    storage = _storage(request)
    staged = None
    storage_key: str | None = None
    try:
        staged = await storage.stage_upload(file)
        duplicate = await session.scalar(
            select(DocumentRecord.id).where(
                DocumentRecord.case_id == case_id,
                DocumentRecord.sha256 == staged.sha256,
            )
        )
        if duplicate is not None:
            await _record_validation_failure(
                session,
                principal=principal,
                case_id=case_id,
                document_id=document_id,
                code="duplicate_document_sha256",
                declared_content_type=file.content_type,
            )
            raise ApplicationError(
                status_code=409,
                code="duplicate_document_sha256",
                message="This binary content already exists in the case.",
            )

        storage_key = storage.finalize(
            staged,
            organization_id=principal.organization.id,
            case_id=case_id,
            document_id=document_id,
        )
        record = DocumentRecord(
            id=document_id,
            organization_id=principal.organization.id,
            case_id=case_id,
            original_filename=file.filename or "document",
            content_type=staged.content_type,
            size_bytes=staged.size_bytes,
            sha256=staged.sha256,
            category=normalized_category,
            status="metadata_only",
            storage_key=storage_key,
            storage_backend="local_private",
            extraction_status="uploaded",
            original_uploaded_at=utc_now(),
            created_by_id=principal.user.id,
        )
        session.add(record)
        await session.flush()
        add_audit_event(
            session,
            organization_id=principal.organization.id,
            actor_user_id=principal.user.id,
            event_type="document_uploaded",
            message="Document binary stored privately after server validation.",
            entity_type="document_record",
            entity_id=record.id,
            case_id=case_id,
            metadata=document_audit_metadata(record),
        )
        await session.commit()
    except DocumentValidationError as error:
        await session.rollback()
        await _record_validation_failure(
            session,
            principal=principal,
            case_id=case_id,
            document_id=document_id,
            code=error.code,
            declared_content_type=file.content_type,
        )
        raise ApplicationError(
            status_code=error.status_code,
            code=error.code,
            message=error.message,
        ) from error
    except IntegrityError as error:
        await session.rollback()
        if storage_key:
            storage.delete_key(storage_key)
        raise ApplicationError(
            status_code=409,
            code="duplicate_document_sha256",
            message="This binary content already exists in the case.",
        ) from error
    except Exception:
        await session.rollback()
        if storage_key:
            storage.delete_key(storage_key)
        raise
    finally:
        await file.close()
        if staged is not None:
            storage.discard(staged)

    settings: Settings = request.app.state.settings
    await process_document(
        session,
        record=record,
        storage=storage,
        settings=settings,
        actor_user_id=principal.user.id,
    )
    return await _detail(session, record, storage)


@router.get("/{document_id}", response_model=DocumentDetailResponse)
async def get_document_detail(
    case_id: str,
    document_id: str,
    request: Request,
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DocumentDetailResponse:
    await get_organization_case(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
    )
    record = await _get_document(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
        document_id=document_id,
    )
    return await _detail(session, record, _storage(request))


@router.get("/{document_id}/download", response_class=FileResponse)
async def download_document(
    case_id: str,
    document_id: str,
    request: Request,
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> FileResponse:
    await get_organization_case(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
    )
    record = await _get_document(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
        document_id=document_id,
    )
    storage = _storage(request)
    if not record.storage_key:
        raise ApplicationError(
            status_code=404,
            code="document_binary_not_found",
            message="This metadata-only record has no stored original file.",
        )
    try:
        source_path = storage.path_for_key(record.storage_key)
    except FileNotFoundError as error:
        raise ApplicationError(
            status_code=404,
            code="document_binary_not_found",
            message="The stored original file could not be found.",
        ) from error
    add_audit_event(
        session,
        organization_id=principal.organization.id,
        actor_user_id=principal.user.id,
        event_type="document_downloaded",
        message="Authenticated user downloaded the original document.",
        entity_type="document_record",
        entity_id=record.id,
        case_id=case_id,
        metadata=document_audit_metadata(record),
    )
    await session.commit()
    return FileResponse(
        path=source_path,
        media_type=record.content_type,
        filename=record.original_filename,
        content_disposition_type="attachment",
    )


@router.post("/{document_id}/reprocess", response_model=DocumentDetailResponse)
async def reprocess_document(
    case_id: str,
    document_id: str,
    request: Request,
    principal: Annotated[Principal, Depends(document_editor)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DocumentDetailResponse:
    await get_organization_case(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
    )
    record = await _get_document(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
        document_id=document_id,
    )
    storage = _storage(request)
    if not record.storage_key or not storage.binary_exists(record.storage_key):
        raise ApplicationError(
            status_code=409,
            code="document_binary_unavailable",
            message="This document cannot be reprocessed because no stored binary exists.",
        )
    settings: Settings = request.app.state.settings
    await process_document(
        session,
        record=record,
        storage=storage,
        settings=settings,
        actor_user_id=principal.user.id,
    )
    add_audit_event(
        session,
        organization_id=principal.organization.id,
        actor_user_id=principal.user.id,
        event_type="document_reprocessed",
        message="Stored document was reprocessed.",
        entity_type="document_record",
        entity_id=record.id,
        case_id=case_id,
        metadata=document_audit_metadata(record),
    )
    await session.commit()
    return await _detail(session, record, storage)


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    case_id: str,
    document_id: str,
    request: Request,
    principal: Annotated[Principal, Depends(document_editor)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await get_organization_case(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
    )
    record = await _get_document(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
        document_id=document_id,
    )
    storage = _storage(request)
    quarantined = storage.quarantine(record.storage_key)
    metadata = document_audit_metadata(record)
    try:
        await session.delete(record)
        add_audit_event(
            session,
            organization_id=principal.organization.id,
            actor_user_id=principal.user.id,
            event_type="document_deleted",
            message="Document record, extracted pages, and stored binary deleted.",
            entity_type="document_record",
            entity_id=document_id,
            case_id=case_id,
            metadata=metadata,
        )
        await session.commit()
    except Exception:
        await session.rollback()
        storage.restore_quarantined(quarantined)
        raise
    storage.purge_quarantined(quarantined)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
