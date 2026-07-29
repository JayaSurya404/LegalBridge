"""JSON-only document metadata routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import Principal, get_current_principal, require_roles
from app.api.routes.cases import get_organization_case
from app.core.errors import ApplicationError
from app.db.session import get_session
from app.models.document import DocumentRecord
from app.models.enums import UserRole
from app.schemas.document import DocumentMetadataCreate, DocumentMetadataResponse
from app.services.audit import add_audit_event

router = APIRouter(prefix="/cases/{case_id}/documents", tags=["document metadata"])
document_editor = require_roles(UserRole.ADMIN, UserRole.ATTORNEY)


@router.get("", response_model=list[DocumentMetadataResponse])
async def list_documents(
    case_id: str,
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> list[DocumentRecord]:
    await get_organization_case(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
    )
    statement = (
        select(DocumentRecord)
        .where(
            DocumentRecord.organization_id == principal.organization.id,
            DocumentRecord.case_id == case_id,
        )
        .order_by(DocumentRecord.created_at.desc())
    )
    return list((await session.scalars(statement)).all())


@router.post(
    "",
    response_model=DocumentMetadataResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_document_metadata(
    case_id: str,
    payload: DocumentMetadataCreate,
    principal: Annotated[Principal, Depends(document_editor)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DocumentRecord:
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
    return record


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document_metadata(
    case_id: str,
    document_id: str,
    principal: Annotated[Principal, Depends(document_editor)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> Response:
    await get_organization_case(
        session,
        organization_id=principal.organization.id,
        case_id=case_id,
    )
    statement = select(DocumentRecord).where(
        DocumentRecord.id == document_id,
        DocumentRecord.organization_id == principal.organization.id,
        DocumentRecord.case_id == case_id,
    )
    record = (await session.scalars(statement)).one_or_none()
    if record is None:
        raise ApplicationError(
            status_code=404,
            code="document_not_found",
            message="Document metadata not found.",
        )

    filename = record.original_filename
    await session.delete(record)
    add_audit_event(
        session,
        organization_id=principal.organization.id,
        actor_user_id=principal.user.id,
        event_type="document_metadata_deletion",
        message="Document metadata deleted.",
        entity_type="document_record",
        entity_id=document_id,
        case_id=case_id,
        metadata={"filename": filename},
    )
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
