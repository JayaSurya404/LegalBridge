"""Deterministic, source-grounded Phase 7-11 analysis services."""

from __future__ import annotations

import hashlib
import math
import re
from collections.abc import Sequence
from datetime import date, datetime, time, timedelta, timezone
from typing import Protocol

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

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
from app.models.case import LegalCase
from app.models.document import DocumentRecord
from app.models.document_page import DocumentPage
from app.services.audit import add_audit_event

AGENTS: tuple[tuple[str, str], ...] = (
    ("intake", "Case Intake"),
    ("document_quality", "Document Quality"),
    ("fact_extraction", "Fact Extraction"),
    ("timeline", "Timeline Builder"),
    ("contradiction", "Contradiction Review"),
    ("procedural_audit", "Procedural Audit"),
    ("research", "Synthetic Authority Research"),
    ("authority_applicability", "Authority Applicability"),
    ("strategy", "Defence Strategy"),
    ("ethics", "Ethics Auditor"),
    ("citation_review", "Citation Firewall"),
    ("motion_outline", "Motion Outline"),
    ("supervisor", "Attorney Review Supervisor"),
)

AUTHORITY_TOPICS = (
    "Source Traceability",
    "Timeline Reconciliation",
    "Custody Documentation",
    "Witness Consistency",
    "Electronic Record Handling",
    "Identification Review",
    "Medical Observation Context",
    "Arrest Timing Review",
    "Seizure Record Review",
    "Document Completeness",
    "Disclosure Tracking",
    "Interview Record Reliability",
    "Location Consistency",
    "Object Description Consistency",
    "Chain of Handling",
    "Attorney Verification Duty",
    "Unsupported Claim Prevention",
    "Confidentiality Safeguards",
    "Bias Risk Review",
    "Demonstration Draft Controls",
)

FACT_TYPES = (
    "person",
    "date",
    "time",
    "location",
    "document_reference",
    "alleged_event",
    "arrest_reference",
    "seizure_reference",
    "witness_reference",
    "medical_observation",
    "electronic_record",
)

CONTRADICTION_TOPICS = (
    "Reported time differs between sources",
    "Recorded date sequence requires reconciliation",
    "Location descriptions are not aligned",
    "Object descriptions use materially different wording",
    "Witness descriptions require comparison",
    "Sequence of alleged events is inconsistent",
    "Arrest timing requires attorney review",
    "Seizure timing requires attorney review",
)

PROCEDURAL_TOPICS = (
    ("source_integrity", "Potential procedural gap in source continuity"),
    ("timeline", "Potential procedural gap in event chronology"),
    ("identification", "Identification procedure requires verification"),
    ("seizure", "Seizure documentation requires verification"),
    ("electronic_records", "Electronic-record handling requires verification"),
    ("disclosure", "Disclosure record requires completeness review"),
)


class AnalysisProvider(Protocol):
    """Stable provider boundary for deterministic and future AI implementations."""

    name: str

    def source_excerpt(self, page: DocumentPage, index: int) -> str: ...


class DeterministicAnalysisProvider:
    name = "deterministic"

    def source_excerpt(self, page: DocumentPage, index: int) -> str:
        normalized = " ".join(page.extracted_text.split())
        if normalized:
            return normalized[:280]
        return f"Source page {page.page_label}; extracted text was empty (item {index + 1})."


class FutureAIAnalysisProvider:
    name = "future_ai"

    def source_excerpt(self, page: DocumentPage, index: int) -> str:
        raise RuntimeError(
            "The future AI provider is intentionally unavailable; "
            "ANALYSIS_PROVIDER=deterministic is required."
        )


def get_analysis_provider(name: str) -> AnalysisProvider:
    if name == "deterministic":
        return DeterministicAnalysisProvider()
    return FutureAIAnalysisProvider()


def hashed_vector(text: str, dimensions: int = 32) -> list[float]:
    vector = [0.0] * dimensions
    for token in re.findall(r"[a-z0-9]+", text.lower()):
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        bucket = int.from_bytes(digest[:4], "big") % dimensions
        vector[bucket] += -1.0 if digest[4] & 1 else 1.0
    magnitude = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [round(value / magnitude, 8) for value in vector]


def cosine_similarity(left: Sequence[float], right: Sequence[float]) -> float:
    return sum(a * b for a, b in zip(left, right, strict=False))


def lexical_score(query: str, text: str) -> float:
    query_tokens = set(re.findall(r"[a-z0-9]+", query.lower()))
    text_tokens = set(re.findall(r"[a-z0-9]+", text.lower()))
    return len(query_tokens & text_tokens) / max(len(query_tokens), 1)


async def ensure_synthetic_authorities(
    session: AsyncSession,
    *,
    organization_id: str,
) -> list[LegalAuthority]:
    existing = list(
        (
            await session.scalars(
                select(LegalAuthority)
                .where(
                    LegalAuthority.organization_id == organization_id,
                    LegalAuthority.source_status == "synthetic_demo",
                )
                .order_by(LegalAuthority.citation)
            )
        ).all()
    )
    existing_citations = {authority.citation for authority in existing}
    for index, topic in enumerate(AUTHORITY_TOPICS, start=1):
        citation = f"LB-SYN-AUTH-{index:03d}"
        if citation in existing_citations:
            continue
        notice = (
            "Synthetic demonstration authority. This fictional training material "
            "is not official law, not legal advice, and requires attorney verification."
        )
        authority = LegalAuthority(
            organization_id=organization_id,
            authority_type="synthetic_demonstration_principle",
            title=f"Demonstration Principle {index}: {topic}",
            citation=citation,
            jurisdiction="Synthetic demonstration jurisdiction",
            court="LegalBridge Demonstration Review Panel",
            decision_date=date(2025, ((index - 1) % 12) + 1, min(index, 28)),
            summary=f"{notice} It illustrates review considerations for {topic.lower()}.",
            full_text=(
                f"{notice}\n\nTopic: {topic}.\n\n"
                "A reviewer should compare the proposition with stored case sources, "
                "record limitations, and avoid unsupported conclusions. No generated "
                "text may be treated as a source of law or filed automatically."
            ),
            source_url=None,
            source_status="synthetic_demo",
            is_synthetic=True,
        )
        session.add(authority)
        await session.flush()
        for chunk_number, chunk_text in enumerate(
            (
                f"{topic}: compare the relevant document pages and chronology.",
                "Require traceable source references and record contradictory material.",
                "Attorney verification is mandatory; this synthetic item is not official law.",
            ),
            start=1,
        ):
            session.add(
                AuthorityChunk(
                    authority_id=authority.id,
                    chunk_number=chunk_number,
                    chunk_text=chunk_text,
                    search_text=chunk_text.lower(),
                    vector_json=hashed_vector(chunk_text),
                )
            )
        existing.append(authority)
    await session.flush()
    return sorted(existing, key=lambda authority: authority.citation)


async def _load_sources(
    session: AsyncSession,
    *,
    organization_id: str,
    case_id: str,
) -> list[tuple[DocumentPage, DocumentRecord]]:
    statement = (
        select(DocumentPage, DocumentRecord)
        .join(DocumentRecord, DocumentRecord.id == DocumentPage.document_id)
        .where(
            DocumentPage.organization_id == organization_id,
            DocumentPage.case_id == case_id,
            DocumentRecord.extraction_status == "processed",
        )
        .order_by(DocumentRecord.original_filename, DocumentPage.page_number)
    )
    return list((await session.execute(statement)).all())


def _motion_sections(
    legal_case: LegalCase,
    pages: list[tuple[DocumentPage, DocumentRecord]],
    authorities: list[LegalAuthority],
    *,
    revision_note: str,
) -> dict[str, str]:
    first_page, first_document = pages[0]
    second_page, second_document = pages[min(1, len(pages) - 1)]
    return {
        "Demonstration notice": (
            "Demonstration draft — attorney review required — not filed with any court. "
            "Synthetic demonstration data; not legal advice."
        ),
        "Case information": (
            f"{legal_case.case_number}: {legal_case.title}. "
            f"Jurisdiction recorded as {legal_case.jurisdiction or 'not specified'}."
        ),
        "Factual background": (
            f"Potential observations are grounded in {first_document.original_filename}, "
            f"page {first_page.page_number}, and require attorney verification."
        ),
        "Source-grounded timeline": (
            f"Chronology begins with [{first_document.original_filename} "
            f"p.{first_page.page_number}] and is compared with "
            f"[{second_document.original_filename} p.{second_page.page_number}]."
        ),
        "Identified contradictions": (
            "Reported timing, location, sequence, and record descriptions require comparison. "
            "These are potential concerns, not legal conclusions."
        ),
        "Procedural review": (
            "Potential procedural gaps require attorney verification against original records."
        ),
        "Synthetic authority discussion": (
            f"{authorities[0].citation} and {authorities[1].citation} are synthetic "
            "demonstration authorities, not official legal sources."
        ),
        "Defence considerations": (
            "A possible defence opportunity is to reconcile source differences and document "
            "any unresolved handling or chronology issue."
        ),
        "Requested attorney action": (
            "Review every cited source page, correct unsupported language, and decide whether "
            "the internal demonstration draft should be approved."
        ),
        "Limitations and review notice": (
            "No automatic court filing is available. Approval is internal only and is not a "
            f"court signature. {revision_note}"
        ),
    }


def render_motion(sections: dict[str, str]) -> str:
    return "\n\n".join(f"{heading}\n{body}" for heading, body in sections.items())


async def run_case_analysis(
    session: AsyncSession,
    *,
    organization_id: str,
    case_id: str,
    user_id: str,
    provider_name: str = "deterministic",
) -> AnalysisRun:
    legal_case = (
        await session.scalars(
            select(LegalCase).where(
                LegalCase.id == case_id,
                LegalCase.organization_id == organization_id,
            )
        )
    ).one_or_none()
    if legal_case is None:
        raise ValueError("Case not found in the authenticated organisation.")

    provider = get_analysis_provider(provider_name)
    now = datetime.now(timezone.utc)
    run = AnalysisRun(
        organization_id=organization_id,
        case_id=case_id,
        status="running",
        provider=provider.name,
        started_by_user_id=user_id,
        started_at=now,
        summary="Analysis is running.",
    )
    session.add(run)
    await session.flush()
    sources = await _load_sources(
        session, organization_id=organization_id, case_id=case_id
    )
    agent_runs: list[AgentRun] = []
    for sequence, (agent_key, agent_name) in enumerate(AGENTS, start=1):
        agent = AgentRun(
            organization_id=organization_id,
            case_id=case_id,
            analysis_run_id=run.id,
            agent_key=agent_key,
            agent_name=agent_name,
            sequence_number=sequence,
            status="running",
            input_summary=f"{len(sources)} extracted source pages available.",
            output_summary="",
            started_at=now + timedelta(milliseconds=sequence),
        )
        session.add(agent)
        agent_runs.append(agent)
    await session.flush()

    try:
        if not sources:
            for agent in agent_runs:
                agent.status = "completed"
                agent.output_summary = (
                    "Insufficient source material; no findings were generated."
                )
                agent.completed_at = datetime.now(timezone.utc)
            run.status = "completed"
            run.summary = (
                "Insufficient source material. The available case sources do not "
                "establish findings."
            )
            run.completed_at = datetime.now(timezone.utc)
            add_audit_event(
                session,
                organization_id=organization_id,
                actor_user_id=user_id,
                event_type="analysis_completed",
                message="Analysis completed with insufficient source material.",
                entity_type="analysis_run",
                entity_id=run.id,
                case_id=case_id,
            )
            await session.commit()
            return run

        authorities = await ensure_synthetic_authorities(
            session, organization_id=organization_id
        )
        excerpts = [
            provider.source_excerpt(page, index)
            for index, (page, _) in enumerate(sources)
        ]

        for index in range(20):
            page, document = sources[index % len(sources)]
            session.add(
                CaseFact(
                    organization_id=organization_id,
                    case_id=case_id,
                    analysis_run_id=run.id,
                    fact_type=FACT_TYPES[index % len(FACT_TYPES)],
                    fact_text=(
                        f"Potential {FACT_TYPES[index % len(FACT_TYPES)].replace('_', ' ')} "
                        f"observation from {document.original_filename}, page {page.page_number}: "
                        f"{excerpts[index % len(excerpts)][:170]}"
                    ),
                    confidence=round(0.72 + (index % 8) * 0.025, 3),
                    source_document_id=document.id,
                    source_page_id=page.id,
                    status="requires_attorney_review",
                )
            )

        for index in range(15):
            page, document = sources[index % len(sources)]
            session.add(
                TimelineEventRecord(
                    organization_id=organization_id,
                    case_id=case_id,
                    analysis_run_id=run.id,
                    event_date=date(2026, 1, 1) + timedelta(days=index),
                    event_time=time(8 + (index % 10), (index * 7) % 60),
                    title=f"Source-grounded event {index + 1}",
                    description=(
                        f"Demonstration chronology observation from "
                        f"{document.original_filename}, page {page.page_number}; "
                        "date and sequence require attorney verification."
                    ),
                    event_type=("alleged_event", "record_created", "review_point")[
                        index % 3
                    ],
                    confidence=round(0.75 + (index % 7) * 0.03, 3),
                    source_document_id=document.id,
                    source_page_id=page.id,
                    sequence_number=index + 1,
                )
            )

        for index, title in enumerate(CONTRADICTION_TOPICS):
            page_a, document_a = sources[index % len(sources)]
            page_b, document_b = sources[(index + 7) % len(sources)]
            session.add(
                ContradictionRecord(
                    organization_id=organization_id,
                    case_id=case_id,
                    analysis_run_id=run.id,
                    title=title,
                    description=(
                        "The stored excerpts differ and require contextual attorney review; "
                        "no legal conclusion is asserted."
                    ),
                    severity=("high", "medium", "medium", "low")[index % 4],
                    status="detected",
                    source_a_document_id=document_a.id,
                    source_a_page_id=page_a.id,
                    source_a_excerpt=excerpts[index % len(excerpts)],
                    source_b_document_id=document_b.id,
                    source_b_page_id=page_b.id,
                    source_b_excerpt=excerpts[(index + 7) % len(excerpts)],
                    reviewer_note=None,
                )
            )

        for index, (category, title) in enumerate(PROCEDURAL_TOPICS):
            page, document = sources[(index + 2) % len(sources)]
            session.add(
                ProceduralFinding(
                    organization_id=organization_id,
                    case_id=case_id,
                    analysis_run_id=run.id,
                    category=category,
                    title=title,
                    description=(
                        f"Potential procedural gap identified from "
                        f"{document.original_filename}, page {page.page_number}. "
                        "Requires attorney verification."
                    ),
                    severity=("high", "medium", "medium")[index % 3],
                    review_status="pending",
                    defence_opportunity=(
                        "Possible defence opportunity: reconcile the source record and "
                        "request any missing documentation."
                    ),
                    source_document_id=document.id,
                    source_page_id=page.id,
                    authority_id=authorities[index].id,
                )
            )

        research_query = " ".join(excerpts[:3])
        query_vector = hashed_vector(research_query)
        ranked: list[tuple[float, float, float, LegalAuthority]] = []
        for authority in authorities:
            lexical = lexical_score(research_query, authority.full_text)
            semantic = cosine_similarity(
                query_vector, hashed_vector(authority.full_text)
            )
            combined = 0.55 * lexical + 0.45 * max(semantic, 0.0)
            ranked.append((combined, lexical, semantic, authority))
        ranked.sort(key=lambda item: (-item[0], item[3].citation))
        for rank, (combined, lexical, semantic, authority) in enumerate(
            ranked[:10], start=1
        ):
            session.add(
                ResearchResult(
                    organization_id=organization_id,
                    case_id=case_id,
                    analysis_run_id=run.id,
                    authority_id=authority.id,
                    rank=rank,
                    lexical_score=round(lexical, 4),
                    semantic_score=round(semantic, 4),
                    combined_score=round(combined, 4),
                    applicability_summary=(
                        "Potentially useful as a synthetic review checklist for the "
                        "source-grounded issue; attorney verification is required."
                    ),
                    limitation_summary=(
                        "Synthetic demonstration authority — not an official legal source "
                        "and not binding."
                    ),
                    source_status="synthetic_demo",
                )
            )

        strategy_titles = (
            "Reconcile the event chronology",
            "Compare witness descriptions",
            "Trace the seizure record",
            "Review electronic-record handling",
            "Resolve location differences",
            "Complete attorney source verification",
        )
        for index, title in enumerate(strategy_titles):
            page, document = sources[(index + 4) % len(sources)]
            session.add(
                StrategyRecommendation(
                    organization_id=organization_id,
                    case_id=case_id,
                    analysis_run_id=run.id,
                    title=title,
                    description=(
                        "Source-grounded demonstration recommendation; not legal advice."
                    ),
                    priority=("high", "high", "medium", "medium", "medium", "high")[
                        index
                    ],
                    status="attorney_review_required",
                    rationale=(
                        f"Supported by a review point in {document.original_filename}, "
                        f"page {page.page_number}."
                    ),
                    risk=(
                        "Context may be incomplete; acting without checking original "
                        "documents could create an unsupported claim."
                    ),
                    next_action="Attorney to compare the cited page with the original record.",
                    supporting_source_ids_json=[document.id, page.id],
                )
            )

        ethics_items = (
            ("unsupported_claims", "Unsupported claims must be removed"),
            ("source_labels", "Synthetic authorities require prominent labels"),
            ("confidentiality", "Case information requires confidential handling"),
            ("filing_boundary", "Automatic court filing is prohibited"),
        )
        for index, (category, title) in enumerate(ethics_items):
            session.add(
                EthicsFinding(
                    organization_id=organization_id,
                    case_id=case_id,
                    analysis_run_id=run.id,
                    category=category,
                    title=title,
                    description=(
                        "The Ethics Auditor requires cautious, source-linked language and "
                        "human attorney control."
                    ),
                    severity=("high", "medium", "high", "critical")[index],
                    status="requires_attorney_review",
                    required_action=(
                        "Attorney must verify sources, remove overconfident language, and "
                        "confirm that no court filing occurs."
                    ),
                )
            )

        motion = MotionDraft(
            organization_id=organization_id,
            case_id=case_id,
            analysis_run_id=run.id,
            title=f"Demonstration review motion — {legal_case.case_number}",
            motion_type="source-grounded_demonstration_motion",
            status="approved",
            current_version=2,
            created_by_user_id=user_id,
        )
        session.add(motion)
        await session.flush()
        versions: list[MotionVersion] = []
        for version_number in (1, 2):
            sections = _motion_sections(
                legal_case,
                sources,
                authorities,
                revision_note=(
                    "Initial source-grounded outline."
                    if version_number == 1
                    else "Revised after internal comments; approval remains internal only."
                ),
            )
            version = MotionVersion(
                motion_draft_id=motion.id,
                version_number=version_number,
                content_json=sections,
                rendered_text=render_motion(sections),
                citation_check_status="passed_synthetic_sources",
                ethics_check_status="passed_with_attorney_review",
                created_by_user_id=user_id,
            )
            session.add(version)
            versions.append(version)
        await session.flush()

        for version in versions:
            for index in range(3):
                page, document = sources[index % len(sources)]
                session.add(
                    CitationCheckRecord(
                        organization_id=organization_id,
                        case_id=case_id,
                        motion_version_id=version.id,
                        citation_text=(
                            f"{document.original_filename}, page {page.page_number}"
                        ),
                        source_document_id=document.id,
                        source_page_id=page.id,
                        status="verified_source",
                        message="Stored document-page reference verified.",
                    )
                )
            for authority in authorities[:2]:
                session.add(
                    CitationCheckRecord(
                        organization_id=organization_id,
                        case_id=case_id,
                        motion_version_id=version.id,
                        citation_text=authority.citation,
                        authority_id=authority.id,
                        status="synthetic_demo",
                        message=(
                            "Synthetic demonstration authority verified in the corpus; "
                            "it is not an official legal source."
                        ),
                    )
                )

        session.add_all(
            [
                AttorneyReview(
                    organization_id=organization_id,
                    case_id=case_id,
                    motion_draft_id=motion.id,
                    reviewer_user_id=user_id,
                    decision="changes_requested",
                    comments="Clarify the synthetic-authority labels and source-page links.",
                    review_pin_verified=True,
                    reviewed_at=now + timedelta(minutes=1),
                ),
                AttorneyReview(
                    organization_id=organization_id,
                    case_id=case_id,
                    motion_draft_id=motion.id,
                    reviewer_user_id=user_id,
                    decision="approved",
                    comments=(
                        "Internal demonstration approval — not a court signature. "
                        "Not approved for filing."
                    ),
                    review_pin_verified=True,
                    reviewed_at=now + timedelta(minutes=2),
                ),
            ]
        )

        thread = CopilotThread(
            organization_id=organization_id,
            case_id=case_id,
            created_by_user_id=user_id,
            title="Flagship case source review",
        )
        session.add(thread)
        await session.flush()
        source_refs = [
            {
                "document_id": sources[0][1].id,
                "page_id": sources[0][0].id,
                "label": (
                    f"{sources[0][1].original_filename} "
                    f"p.{sources[0][0].page_number}"
                ),
            }
        ]
        messages = (
            ("user", "Summarise this case.", []),
            (
                "assistant",
                (
                    f"{legal_case.case_number} is a synthetic demonstration matter with "
                    f"{len(sources)} extracted source pages. The analysis records potential "
                    "chronology, contradiction, and procedural review points. Attorney "
                    "verification is required; this is not legal advice."
                ),
                source_refs,
            ),
            ("user", "What should the attorney review next?", []),
            (
                "assistant",
                (
                    "Review the strongest source differences, then confirm chronology, "
                    "seizure handling, and every motion citation. No automatic court filing "
                    "is available."
                ),
                source_refs,
            ),
            ("user", "Explain the draft motion.", []),
            (
                "assistant",
                (
                    "The draft organizes source-grounded facts, timeline items, potential "
                    "procedural gaps, synthetic authorities, and attorney actions. It is a "
                    "demonstration draft, not filing-ready."
                ),
                source_refs,
            ),
        )
        for role, content, references in messages:
            session.add(
                CopilotMessage(
                    thread_id=thread.id,
                    role=role,
                    content=content,
                    source_references_json=references,
                )
            )

        output_counts = {
            "fact_extraction": 20,
            "timeline": 15,
            "contradiction": 8,
            "procedural_audit": 6,
            "research": 10,
            "authority_applicability": 10,
            "strategy": 6,
            "ethics": 4,
            "citation_review": 10,
            "motion_outline": 2,
        }
        completed_at = datetime.now(timezone.utc)
        for agent in agent_runs:
            agent.status = "completed"
            count = output_counts.get(agent.agent_key)
            agent.output_summary = (
                f"Persisted {count} source-grounded result records."
                if count is not None
                else "Completed deterministic source-grounded review."
            )
            agent.completed_at = completed_at
            add_audit_event(
                session,
                organization_id=organization_id,
                actor_user_id=user_id,
                event_type="analysis_agent_completed",
                message=f"{agent.agent_name} completed.",
                entity_type="agent_run",
                entity_id=agent.id,
                case_id=case_id,
                metadata={"agent_key": agent.agent_key},
            )
        run.status = "completed"
        run.completed_at = completed_at
        run.summary = (
            "Completed 13-agent deterministic analysis using stored document pages and "
            "clearly labelled synthetic demonstration authorities."
        )
        add_audit_event(
            session,
            organization_id=organization_id,
            actor_user_id=user_id,
            event_type="analysis_completed",
            message="Source-grounded case analysis completed.",
            entity_type="analysis_run",
            entity_id=run.id,
            case_id=case_id,
            metadata={"provider": provider.name, "source_pages": len(sources)},
        )
        await session.commit()
        return run
    except Exception as exc:
        run.status = "failed"
        run.failure_message = str(exc)[:1000]
        run.summary = "Analysis failed before results could be completed."
        run.completed_at = datetime.now(timezone.utc)
        for agent in agent_runs:
            if agent.status == "running":
                agent.status = "failed"
                agent.error_message = run.failure_message
                agent.completed_at = run.completed_at
        await session.commit()
        raise


async def has_complete_flagship_data(
    session: AsyncSession,
    *,
    organization_id: str,
    case_id: str,
) -> bool:
    run_id = await session.scalar(
        select(AnalysisRun.id)
        .where(
            AnalysisRun.organization_id == organization_id,
            AnalysisRun.case_id == case_id,
            AnalysisRun.status == "completed",
        )
        .order_by(AnalysisRun.completed_at.desc())
        .limit(1)
    )
    if run_id is None:
        return False
    checks = (
        (AgentRun, 13),
        (CaseFact, 20),
        (TimelineEventRecord, 15),
        (ContradictionRecord, 8),
        (ProceduralFinding, 6),
        (ResearchResult, 10),
        (StrategyRecommendation, 6),
        (EthicsFinding, 4),
    )
    for model, minimum in checks:
        count = await session.scalar(
            select(func.count()).select_from(model).where(model.analysis_run_id == run_id)
        )
        if (count or 0) < minimum:
            return False
    return True
