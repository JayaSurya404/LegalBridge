"""Idempotently seed only Phase 7-11 data for the flagship jury case."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass

from sqlalchemy import func, select

from app.core.config import get_settings
from app.db.session import Database
from app.models.analysis import (
    AgentRun,
    AnalysisRun,
    AttorneyReview,
    CaseFact,
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
from app.models.case import LegalCase
from app.models.organization import Organization
from app.models.user import User
from app.services.analysis import (
    ensure_synthetic_authorities,
    has_complete_flagship_data,
    run_case_analysis,
)

ORGANIZATION_SLUG = "legalbridge-main"
FLAGSHIP_CASE_NUMBER = "LB-MAIN-2026-001"
PRIMARY_EMAIL = "legalbridge@legalbridge.demo"


@dataclass(frozen=True)
class BootstrapResult:
    status: str
    analysis_run_id: str
    authorities: int
    agents: int
    facts: int
    timeline: int
    contradictions: int
    procedural_findings: int
    research_results: int
    strategies: int
    ethics_findings: int
    motions: int
    motion_versions: int
    reviews: int
    copilot_threads: int
    copilot_messages: int


async def bootstrap(database: Database) -> BootstrapResult:
    async with database.session_factory() as session:
        organization = (
            await session.scalars(
                select(Organization).where(Organization.slug == ORGANIZATION_SLUG)
            )
        ).one_or_none()
        if organization is None:
            raise RuntimeError("The legalbridge-main organisation does not exist.")
        user = (
            await session.scalars(
                select(User).where(
                    User.organization_id == organization.id,
                    User.email == PRIMARY_EMAIL,
                )
            )
        ).one_or_none()
        legal_case = (
            await session.scalars(
                select(LegalCase).where(
                    LegalCase.organization_id == organization.id,
                    LegalCase.case_number == FLAGSHIP_CASE_NUMBER,
                )
            )
        ).one_or_none()
        if user is None or legal_case is None:
            raise RuntimeError("The existing flagship case or primary user is missing.")
        await ensure_synthetic_authorities(
            session, organization_id=organization.id
        )
        await session.commit()
        complete = await has_complete_flagship_data(
            session, organization_id=organization.id, case_id=legal_case.id
        )
        if complete:
            run = (
                await session.scalars(
                    select(AnalysisRun)
                    .where(
                        AnalysisRun.organization_id == organization.id,
                        AnalysisRun.case_id == legal_case.id,
                        AnalysisRun.status == "completed",
                    )
                    .order_by(AnalysisRun.completed_at.desc())
                    .limit(1)
                )
            ).one()
            status = "already_complete"
        else:
            run = await run_case_analysis(
                session,
                organization_id=organization.id,
                case_id=legal_case.id,
                user_id=user.id,
                provider_name="deterministic",
            )
            status = "created"

        async def count(model: type[object], *filters: object) -> int:
            value = await session.scalar(
                select(func.count()).select_from(model).where(*filters)
            )
            return value or 0

        motion_ids = list(
            (
                await session.scalars(
                    select(MotionDraft.id).where(
                        MotionDraft.analysis_run_id == run.id
                    )
                )
            ).all()
        )
        thread_ids = list(
            (
                await session.scalars(
                    select(CopilotThread.id).where(
                        CopilotThread.organization_id == organization.id,
                        CopilotThread.case_id == legal_case.id,
                    )
                )
            ).all()
        )
        return BootstrapResult(
            status=status,
            analysis_run_id=run.id,
            authorities=await count(
                LegalAuthority,
                LegalAuthority.organization_id == organization.id,
                LegalAuthority.is_synthetic.is_(True),
                LegalAuthority.source_status == "synthetic_demo",
            ),
            agents=await count(AgentRun, AgentRun.analysis_run_id == run.id),
            facts=await count(CaseFact, CaseFact.analysis_run_id == run.id),
            timeline=await count(
                TimelineEventRecord, TimelineEventRecord.analysis_run_id == run.id
            ),
            contradictions=await count(
                ContradictionRecord, ContradictionRecord.analysis_run_id == run.id
            ),
            procedural_findings=await count(
                ProceduralFinding, ProceduralFinding.analysis_run_id == run.id
            ),
            research_results=await count(
                ResearchResult, ResearchResult.analysis_run_id == run.id
            ),
            strategies=await count(
                StrategyRecommendation,
                StrategyRecommendation.analysis_run_id == run.id,
            ),
            ethics_findings=await count(
                EthicsFinding, EthicsFinding.analysis_run_id == run.id
            ),
            motions=len(motion_ids),
            motion_versions=(
                await count(
                    MotionVersion, MotionVersion.motion_draft_id.in_(motion_ids)
                )
                if motion_ids
                else 0
            ),
            reviews=(
                await count(
                    AttorneyReview, AttorneyReview.motion_draft_id.in_(motion_ids)
                )
                if motion_ids
                else 0
            ),
            copilot_threads=len(thread_ids),
            copilot_messages=(
                await count(
                    CopilotMessage, CopilotMessage.thread_id.in_(thread_ids)
                )
                if thread_ids
                else 0
            ),
        )


async def main() -> None:
    settings = get_settings()
    if not settings.database_url.startswith("postgresql+asyncpg://"):
        raise RuntimeError("Phase 7-11 jury bootstrap requires active PostgreSQL.")
    database = Database(
        settings.database_url,
        echo=settings.sql_echo,
        ssl_mode=settings.database_ssl,
        pool_size=settings.database_pool_size,
        max_overflow=settings.database_max_overflow,
        pool_timeout=settings.database_pool_timeout,
        pool_recycle=settings.database_pool_recycle,
    )
    try:
        result = await bootstrap(database)
    finally:
        await database.dispose()
    for key, value in result.__dict__.items():
        print(f"{key}: {value}")


if __name__ == "__main__":
    asyncio.run(main())
