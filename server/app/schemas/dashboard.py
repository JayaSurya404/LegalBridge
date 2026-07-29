"""Organisation-scoped dashboard aggregate schemas."""

from app.schemas.audit import AuditEventResponse
from app.schemas.base import ORMResponse


class DashboardSummaryResponse(ORMResponse):
    total_cases: int
    active_cases: int
    review_cases: int
    draft_cases: int
    closed_cases: int
    archived_cases: int
    total_documents: int
    processed_documents: int
    ocr_required_documents: int
    failed_documents: int
    extracted_source_pages: int
    total_audit_events: int
    recent_audit_events: list[AuditEventResponse]
