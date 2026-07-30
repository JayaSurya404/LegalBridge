"""Phase 3 SQLAlchemy models."""

from app.models.analysis import (
    AgentRun,
    AnalysisRun,
    AttorneyReview,
    AuthorityChunk,
    CaseFact,
    CitationCheckRecord,
    ContradictionRecord,
    CopilotMessage,
    CopilotThread,
    EthicsFinding,
    LegalAuthority,
    MotionDraft,
    MotionVersion,
    ProceduralFinding,
    ResearchResult,
    StrategyRecommendation,
    TimelineEventRecord,
)
from app.models.copilot import (
    CaseMemory,
    CopilotArtifact,
    CopilotClaimCitation,
    CopilotExecutionRun,
    DocumentPageEmbedding,
)
from app.models.audit import AuditEvent
from app.models.auth_session import AuthSession
from app.models.case import LegalCase
from app.models.document import DocumentRecord
from app.models.document_page import DocumentPage
from app.models.enums import CaseStatus, UserRole
from app.models.organization import Organization
from app.models.user import User

__all__ = [
    "AuditEvent",
    "AgentRun",
    "AnalysisRun",
    "AttorneyReview",
    "AuthorityChunk",
    "AuthSession",
    "CaseStatus",
    "CaseFact",
    "CitationCheckRecord",
    "ContradictionRecord",
    "CaseMemory",
    "CopilotArtifact",
    "CopilotClaimCitation",
    "CopilotExecutionRun",
    "DocumentPageEmbedding",
    "CopilotMessage",
    "CopilotThread",
    "DocumentRecord",
    "DocumentPage",
    "EthicsFinding",
    "LegalCase",
    "LegalAuthority",
    "MotionDraft",
    "MotionVersion",
    "Organization",
    "ProceduralFinding",
    "ResearchResult",
    "StrategyRecommendation",
    "TimelineEventRecord",
    "User",
    "UserRole",
]
