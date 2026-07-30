"""Efficient organisation-scoped dashboard aggregates."""

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import Principal, get_current_principal
from app.db.session import get_session
from app.models.analysis import AnalysisRun, MotionDraft
from app.models.audit import AuditEvent
from app.models.case import LegalCase
from app.models.document import DocumentRecord
from app.models.document_page import DocumentPage
from app.schemas.dashboard import DashboardSummaryResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
async def dashboard_summary(
    principal: Annotated[Principal, Depends(get_current_principal)],
    session: Annotated[AsyncSession, Depends(get_session)],
) -> DashboardSummaryResponse:
    organization_id = principal.organization.id
    case_rows = (
        await session.execute(
            select(LegalCase.status, func.count(LegalCase.id))
            .where(LegalCase.organization_id == organization_id)
            .group_by(LegalCase.status)
        )
    ).all()
    case_counts = {status.value: count for status, count in case_rows}

    document_rows = (
        await session.execute(
            select(DocumentRecord.extraction_status, func.count(DocumentRecord.id))
            .where(DocumentRecord.organization_id == organization_id)
            .group_by(DocumentRecord.extraction_status)
        )
    ).all()
    document_counts = {status: count for status, count in document_rows}
    total_documents = sum(document_counts.values())

    extracted_source_pages = await session.scalar(
        select(func.count(DocumentPage.id)).where(DocumentPage.organization_id == organization_id)
    )
    total_audit_events = await session.scalar(
        select(func.count(AuditEvent.id)).where(AuditEvent.organization_id == organization_id)
    )
    completed_analyses = await session.scalar(
        select(func.count(func.distinct(AnalysisRun.case_id))).where(
            AnalysisRun.organization_id == organization_id,
            AnalysisRun.status == "completed",
        )
    )
    motions_awaiting_review = await session.scalar(
        select(func.count(MotionDraft.id)).where(
            MotionDraft.organization_id == organization_id,
            MotionDraft.status == "submitted_for_review",
        )
    )
    approved_motions = await session.scalar(
        select(func.count(MotionDraft.id)).where(
            MotionDraft.organization_id == organization_id,
            MotionDraft.status.in_(("approved", "exported")),
        )
    )
    recent_audit_events = list(
        (
            await session.scalars(
                select(AuditEvent)
                .where(AuditEvent.organization_id == organization_id)
                .order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
                .limit(10)
            )
        ).all()
    )

    return DashboardSummaryResponse(
        total_cases=sum(case_counts.values()),
        active_cases=case_counts.get("active", 0),
        review_cases=case_counts.get("review", 0),
        draft_cases=case_counts.get("draft", 0),
        closed_cases=case_counts.get("closed", 0),
        archived_cases=case_counts.get("archived", 0),
        total_documents=total_documents,
        processed_documents=document_counts.get("processed", 0),
        ocr_required_documents=document_counts.get("ocr_required", 0),
        failed_documents=document_counts.get("failed", 0),
        extracted_source_pages=extracted_source_pages or 0,
        completed_analyses=completed_analyses or 0,
        motions_awaiting_review=motions_awaiting_review or 0,
        approved_motions=approved_motions or 0,
        total_audit_events=total_audit_events or 0,
        recent_audit_events=recent_audit_events,
    )
