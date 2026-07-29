"""Shared serialization, aggregate queries, and deterministic Copilot responses."""

from __future__ import annotations

from datetime import date, datetime, time
from typing import Any

from sqlalchemy import inspect, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import (
    AgentRun,
    AnalysisRun,
    AttorneyReview,
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
from app.models.document import DocumentRecord
from app.models.document_page import DocumentPage


def serialize_model(model: object) -> dict[str, Any]:
    values: dict[str, Any] = {}
    for column in inspect(model).mapper.column_attrs:
        value = getattr(model, column.key)
        if isinstance(value, (date, datetime, time)):
            value = value.isoformat()
        values[column.key] = value
    return values


async def latest_analysis_run(
    session: AsyncSession,
    *,
    organization_id: str,
    case_id: str,
) -> AnalysisRun | None:
    return (
        await session.scalars(
            select(AnalysisRun)
            .where(
                AnalysisRun.organization_id == organization_id,
                AnalysisRun.case_id == case_id,
            )
            .order_by(AnalysisRun.created_at.desc())
            .limit(1)
        )
    ).one_or_none()


async def list_for_run(
    session: AsyncSession,
    model: type[Any],
    run_id: str,
    *,
    order_by: Any | None = None,
) -> list[Any]:
    statement = select(model).where(model.analysis_run_id == run_id)
    if order_by is not None:
        statement = statement.order_by(order_by)
    return list((await session.scalars(statement)).all())


async def motion_payload(
    session: AsyncSession,
    motion: MotionDraft,
) -> dict[str, Any]:
    versions = list(
        (
            await session.scalars(
                select(MotionVersion)
                .where(MotionVersion.motion_draft_id == motion.id)
                .order_by(MotionVersion.version_number)
            )
        ).all()
    )
    version_ids = [version.id for version in versions]
    checks = (
        list(
            (
                await session.scalars(
                    select(CitationCheckRecord)
                    .where(CitationCheckRecord.motion_version_id.in_(version_ids))
                    .order_by(CitationCheckRecord.created_at)
                )
            ).all()
        )
        if version_ids
        else []
    )
    reviews = list(
        (
            await session.scalars(
                select(AttorneyReview)
                .where(AttorneyReview.motion_draft_id == motion.id)
                .order_by(AttorneyReview.created_at)
            )
        ).all()
    )
    return {
        **serialize_model(motion),
        "versions": [serialize_model(item) for item in versions],
        "citation_checks": [serialize_model(item) for item in checks],
        "reviews": [serialize_model(item) for item in reviews],
    }


async def analysis_summary(
    session: AsyncSession,
    *,
    organization_id: str,
    case_id: str,
) -> dict[str, Any]:
    run = await latest_analysis_run(
        session, organization_id=organization_id, case_id=case_id
    )
    if run is None:
        return {
            "analysis_run": None,
            "agents": [],
            "facts": [],
            "timeline": [],
            "contradictions": [],
            "procedural_findings": [],
            "research": [],
            "strategies": [],
            "ethics_findings": [],
            "motions": [],
            "copilot_threads": [],
            "counts": {},
        }
    run_id = run.id
    agents = await list_for_run(
        session, AgentRun, run_id, order_by=AgentRun.sequence_number
    )
    facts = await list_for_run(session, CaseFact, run_id, order_by=CaseFact.created_at)
    timeline = await list_for_run(
        session, TimelineEventRecord, run_id, order_by=TimelineEventRecord.sequence_number
    )
    contradictions = await list_for_run(
        session, ContradictionRecord, run_id, order_by=ContradictionRecord.created_at
    )
    procedural = await list_for_run(
        session, ProceduralFinding, run_id, order_by=ProceduralFinding.created_at
    )
    research_rows = await list_for_run(
        session, ResearchResult, run_id, order_by=ResearchResult.rank
    )
    authority_ids = [row.authority_id for row in research_rows]
    authorities = (
        {
            item.id: item
            for item in (
                await session.scalars(
                    select(LegalAuthority).where(LegalAuthority.id.in_(authority_ids))
                )
            ).all()
        }
        if authority_ids
        else {}
    )
    research = [
        {
            **serialize_model(row),
            "authority": serialize_model(authorities[row.authority_id]),
        }
        for row in research_rows
        if row.authority_id in authorities
    ]
    strategies = await list_for_run(
        session,
        StrategyRecommendation,
        run_id,
        order_by=StrategyRecommendation.created_at,
    )
    ethics = await list_for_run(
        session, EthicsFinding, run_id, order_by=EthicsFinding.created_at
    )
    motions = list(
        (
            await session.scalars(
                select(MotionDraft)
                .where(
                    MotionDraft.organization_id == organization_id,
                    MotionDraft.case_id == case_id,
                    MotionDraft.analysis_run_id == run_id,
                )
                .order_by(MotionDraft.created_at)
            )
        ).all()
    )
    threads = list(
        (
            await session.scalars(
                select(CopilotThread)
                .where(
                    CopilotThread.organization_id == organization_id,
                    CopilotThread.case_id == case_id,
                )
                .order_by(CopilotThread.updated_at.desc())
            )
        ).all()
    )
    thread_payloads: list[dict[str, Any]] = []
    for thread in threads:
        messages = list(
            (
                await session.scalars(
                    select(CopilotMessage)
                    .where(CopilotMessage.thread_id == thread.id)
                    .order_by(CopilotMessage.created_at)
                )
            ).all()
        )
        thread_payloads.append(
            {
                **serialize_model(thread),
                "messages": [serialize_model(item) for item in messages],
            }
        )
    motion_payloads = [await motion_payload(session, motion) for motion in motions]
    collections = {
        "agents": agents,
        "facts": facts,
        "timeline": timeline,
        "contradictions": contradictions,
        "procedural_findings": procedural,
        "research": research,
        "strategies": strategies,
        "ethics_findings": ethics,
        "motions": motion_payloads,
        "copilot_threads": thread_payloads,
    }
    return {
        "analysis_run": serialize_model(run),
        **{
            key: (
                [serialize_model(item) for item in value]
                if value and not isinstance(value[0], dict)
                else value
            )
            for key, value in collections.items()
        },
        "counts": {key: len(value) for key, value in collections.items()},
    }


async def copilot_answer(
    session: AsyncSession,
    *,
    organization_id: str,
    case_id: str,
    question: str,
) -> tuple[str, list[dict[str, str]]]:
    summary = await analysis_summary(
        session, organization_id=organization_id, case_id=case_id
    )
    page_row = (
        await session.execute(
            select(DocumentPage, DocumentRecord)
            .join(DocumentRecord, DocumentRecord.id == DocumentPage.document_id)
            .where(
                DocumentPage.organization_id == organization_id,
                DocumentPage.case_id == case_id,
            )
            .order_by(DocumentPage.created_at)
            .limit(1)
        )
    ).first()
    references: list[dict[str, str]] = []
    if page_row:
        page, document = page_row
        references.append(
            {
                "document_id": document.id,
                "page_id": page.id,
                "label": f"{document.original_filename} p.{page.page_number}",
            }
        )
    if summary["analysis_run"] is None:
        return "The available case sources do not establish this.", references
    lowered = question.lower()
    counts = summary["counts"]
    if "timeline" in lowered:
        answer = (
            f"The persisted analysis contains {counts['timeline']} timeline events. "
            "Each is a potential source-grounded observation requiring attorney verification."
        )
    elif "contradiction" in lowered:
        answer = (
            f"The analysis records {counts['contradictions']} source comparisons. "
            "The strongest items concern timing, sequence, location, and record wording; "
            "they are not legal conclusions."
        )
    elif "procedural" in lowered or "gap" in lowered:
        answer = (
            f"There are {counts['procedural_findings']} potential procedural gaps. "
            "Each requires attorney verification and may present a possible defence opportunity."
        )
    elif "motion" in lowered or "draft" in lowered:
        answer = (
            "The demonstration motion organizes source-grounded observations, synthetic "
            "authorities, limitations, and requested attorney actions. It is not filing-ready "
            "and cannot be filed automatically."
        )
    elif "next" in lowered or "unresolved" in lowered or "review" in lowered:
        answer = (
            "Review source differences first, confirm the chronology and document handling, "
            "then validate every motion citation and ethics warning."
        )
    elif "summar" in lowered or "case" in lowered:
        answer = (
            f"The completed deterministic analysis contains {counts['facts']} facts, "
            f"{counts['timeline']} timeline events, {counts['contradictions']} contradictions, "
            f"and {counts['procedural_findings']} procedural review points. Synthetic "
            "demonstration data; not legal advice; attorney verification required."
        )
    else:
        answer = "The available case sources do not establish this."
    return answer, references
