"""Shared serialization, aggregate queries, and deterministic Copilot responses."""

from __future__ import annotations

import re
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
from app.models.user import User
from app.services.analysis import cosine_similarity, hashed_vector, lexical_score


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
    reviewer_ids = {review.reviewer_user_id for review in reviews}
    reviewers = (
        {
            user.id: user
            for user in (
                await session.scalars(select(User).where(User.id.in_(reviewer_ids)))
            ).all()
        }
        if reviewer_ids
        else {}
    )
    return {
        **serialize_model(motion),
        "versions": [serialize_model(item) for item in versions],
        "citation_checks": [serialize_model(item) for item in checks],
        "reviews": [
            {
                **serialize_model(item),
                "reviewer_name": reviewers[item.reviewer_user_id].full_name,
                "reviewer_role": reviewers[item.reviewer_user_id].role.value,
            }
            for item in reviews
            if item.reviewer_user_id in reviewers
        ],
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
    rows = list(
        (
            await session.execute(
                select(DocumentPage, DocumentRecord)
                .join(DocumentRecord, DocumentRecord.id == DocumentPage.document_id)
                .where(
                    DocumentPage.organization_id == organization_id,
                    DocumentPage.case_id == case_id,
                    DocumentRecord.extraction_status == "processed",
                )
                .order_by(DocumentRecord.original_filename, DocumentPage.page_number)
            )
        ).all()
    )
    if not rows:
        return (
            "I could not find support for that statement in the uploaded case records.",
            [],
        )

    lowered = question.casefold()
    mentioned = {
        document.original_filename.casefold()
        for _, document in rows
        if document.original_filename.casefold() in lowered
        or document.original_filename.rsplit(".", 1)[0].casefold() in lowered
    }
    candidates = [
        (page, document)
        for page, document in rows
        if not mentioned or document.original_filename.casefold() in mentioned
    ]
    query_vector = hashed_vector(question)
    scored = [
        (
            0.65 * lexical_score(question, page.extracted_text)
            + 0.35
            * max(cosine_similarity(query_vector, hashed_vector(page.extracted_text)), 0),
            page,
            document,
        )
        for page, document in candidates
    ]
    scored.sort(key=lambda item: (-item[0], item[2].original_filename, item[1].page_number))
    broad_question = any(
        phrase in lowered
        for phrase in ("entire case", "all documents", "chronology", "compare")
    )
    selected = scored[:8 if broad_question else 5]
    if not selected or (
        selected[0][0] <= 0
        and not any(word in lowered for word in ("summar", "case", "review"))
    ):
        return (
            "I could not find support for that statement in the uploaded case records.",
            [],
        )

    references = [
        {
            "document_id": document.id,
            "page_id": page.id,
            "label": f"{document.original_filename} p.{page.page_number}",
            "filename": document.original_filename,
            "page_number": str(page.page_number),
        }
        for _, page, document in selected
    ]
    record_lines: list[tuple[str, str, str, DocumentPage, DocumentRecord]] = []
    pattern = re.compile(
        r"(?im)^RECORD:\s*([^|\r\n]+)\|\s*([^|\r\n]+)\|\s*([^\r\n]+)"
    )
    for _, page, document in selected:
        for match in pattern.finditer(page.extracted_text):
            record_lines.append(
                (
                    match.group(1).strip(),
                    match.group(2).strip(),
                    match.group(3).strip(),
                    page,
                    document,
                )
            )

    relevant_terms = {
        token
        for token in re.findall(r"[a-z0-9-]+", lowered)
        if len(token) > 3
    }
    matching = [
        item
        for item in record_lines
        if relevant_terms
        & set(re.findall(r"[a-z0-9-]+", " ".join(item[:3]).casefold()))
    ]
    chosen = matching[:8] or record_lines[:8]
    if not chosen:
        excerpts = []
        for _, page, document in selected[:4]:
            text = " ".join(page.extracted_text.split())
            excerpts.append(
                f"{text[:260]} [{document.original_filename} p.{page.page_number}]"
            )
        return " ".join(excerpts), references

    lead = (
        "The retrieved case records show the following source-linked points:"
        if broad_question or "summar" in lowered
        else "The records support these points:"
    )
    bullets = [
        (
            f"- {key.replace('_', ' ').title()}: {value}. {detail} "
            f"[{document.original_filename} p.{page.page_number}]"
        )
        for key, value, detail, page, document in chosen
    ]
    return f"{lead}\n" + "\n".join(bullets), references
