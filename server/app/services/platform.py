"""Shared serialization, aggregate queries, and deterministic Copilot responses."""

from __future__ import annotations

import re
import httpx
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
from app.models.case import LegalCase
from app.models.document import DocumentRecord
from app.models.document_page import DocumentPage
from app.core.config import get_settings
from app.models.user import User
from app.services.analysis import cosine_similarity, hashed_vector, lexical_score

_RECORD_PAT = re.compile(
    r"(?im)^RECORD:\s*([^|\r\n]+)\|\s*([^|\r\n]+)\|\s*([^\r\n]+)"
)


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


def _extract_records(
    pages: list[tuple[DocumentPage, DocumentRecord]],
) -> list[tuple[str, str, str, DocumentPage, DocumentRecord]]:
    """Return all RECORD: triples from the given pages."""
    out: list[tuple[str, str, str, DocumentPage, DocumentRecord]] = []
    for page, doc in pages:
        for m in _RECORD_PAT.finditer(page.extracted_text):
            out.append((m.group(1).strip(), m.group(2).strip(), m.group(3).strip(), page, doc))
    return out


def _ref(page: DocumentPage, doc: DocumentRecord) -> dict[str, str]:
    return {
        "document_id": doc.id,
        "page_id": page.id,
        "label": f"{doc.original_filename} p.{page.page_number}",
        "filename": doc.original_filename,
        "page_number": str(page.page_number),
    }


def _dedup_refs(refs: list[dict[str, str]]) -> list[dict[str, str]]:
    seen: set[str] = set()
    out: list[dict[str, str]] = []
    for r in refs:
        key = r["label"]
        if key not in seen:
            seen.add(key)
            out.append(r)
    return out


async def _load_all_pages(
    session: AsyncSession,
    *,
    organization_id: str,
    case_id: str,
) -> list[tuple[DocumentPage, DocumentRecord]]:
    return list(
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


async def _similar_cases(
    session: AsyncSession,
    *,
    organization_id: str,
    current_case_id: str,
    contradiction_topics: list[str],
    limit: int = 3,
) -> list[dict[str, Any]]:
    """Return closed cases from the same organisation with matching contradiction topics."""
    from app.models.enums import CaseStatus  # local import avoids circular dependency

    closed_cases = list(
        (
            await session.scalars(
                select(LegalCase).where(
                    LegalCase.organization_id == organization_id,
                    LegalCase.id != current_case_id,
                    LegalCase.status.in_([CaseStatus.CLOSED, CaseStatus.ARCHIVED]),
                )
            )
        ).all()
    )
    if not closed_cases:
        return []
    results: list[dict[str, Any]] = []
    for case in closed_cases[:limit]:
        run = (
            await session.scalars(
                select(AnalysisRun)
                .where(
                    AnalysisRun.organization_id == organization_id,
                    AnalysisRun.case_id == case.id,
                    AnalysisRun.status == "completed",
                )
                .order_by(AnalysisRun.created_at.desc())
                .limit(1)
            )
        ).one_or_none()
        if run is None:
            continue
        contradictions = list(
            (
                await session.scalars(
                    select(ContradictionRecord)
                    .where(ContradictionRecord.analysis_run_id == run.id)
                    .limit(5)
                )
            ).all()
        )
        topic_match = any(
            any(needle.lower() in (c.title or "").lower() for needle in contradiction_topics)
            for c in contradictions
        )
        results.append({
            "case_number": case.case_number,
            "title": case.title,
            "status": case.status.value if hasattr(case.status, "value") else str(case.status),
            "contradictions": [{"title": c.title, "description": c.description} for c in contradictions],
            "topic_match": topic_match,
        })
    return results


async def _nvidia_nim_answer(
    question: str,
    selected: list[tuple[float, DocumentPage, DocumentRecord]],
) -> str | None:
    """Use NIM only with labelled extracted evidence; return None for fallback."""
    settings = get_settings()
    if settings.ai_provider != "nvidia_nim":
        return None
    context = "\n\n".join(
        f"SOURCE [{document.original_filename} p.{page.page_number}]\n{page.extracted_text[:5000]}"
        for _, page, document in selected[:16]
    )
    if not context:
        return None
    payload = {
        "model": settings.nvidia_nim_model,
        "temperature": 0,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are LegalBridge Copilot. Answer only from the supplied SOURCE blocks. "
                    "Do not invent facts, files, pages, statutes, or precedents. Use concise sections "
                    "for Findings, Evidence, and Attorney review. Every factual statement must include "
                    "the exact [filename p.number] citation from a supplied source."
                ),
            },
            {"role": "user", "content": f"Question: {question}\n\n{context}"},
        ],
    }
    try:
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.post(
                f"{settings.nvidia_nim_base_url.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {settings.nvidia_nim_api_key}"},
                json=payload,
            )
            response.raise_for_status()
        content = response.json().get("choices", [{}])[0].get("message", {}).get("content", "")
        return content.strip() or None
    except (httpx.HTTPError, ValueError, KeyError, IndexError, TypeError):
        if not settings.ai_fallback_enabled:
            raise
        return None


async def copilot_answer(
    session: AsyncSession,
    *,
    organization_id: str,
    case_id: str,
    question: str,
) -> tuple[str, list[dict[str, str]]]:
    all_rows = await _load_all_pages(session, organization_id=organization_id, case_id=case_id)
    if not all_rows:
        return (
            "No extracted source pages exist for this case yet. Upload and process documents, "
            "then run analysis before asking Copilot questions.",
            [],
        )


    lowered = question.casefold()

    # ── intent detection ──────────────────────────────────────────────────────
    is_summary = any(p in lowered for p in ("summar", "entire case", "overview", "all documents"))
    is_compare = any(p in lowered for p in ("compar", "contrast", "difference", "vs ", "versus"))
    is_timeline = any(p in lowered for p in ("chronolog", "timeline", "sequence", "order of events"))
    is_contradiction = any(p in lowered for p in ("contradict", "inconsisten", "discrepanc", "conflict"))
    is_similar = any(p in lowered for p in ("similar case", "previous case", "prior case", "related case", "same organisation", "same organization", "other case"))
    is_report = any(p in lowered for p in ("generate", "report", "pdf", "docx", "export", "download"))
    is_broad = is_summary or is_timeline or is_compare or is_contradiction or is_similar

    # ── filename mention detection ────────────────────────────────────────────
    mentioned_filenames = {
        doc.original_filename.casefold()
        for _, doc in all_rows
        if doc.original_filename.casefold() in lowered
        or doc.original_filename.rsplit(".", 1)[0].casefold() in lowered
    }

    # ── route: similar cases ──────────────────────────────────────────────────
    if is_similar:
        all_records = _extract_records(all_rows)
        contradiction_topics = list({k for k, _, _, _, _ in all_records})
        similar = await _similar_cases(
            session,
            organization_id=organization_id,
            current_case_id=case_id,
            contradiction_topics=contradiction_topics,
        )
        if not similar:
            return (
                "No closed or archived cases exist in this organisation yet. "
                "Similar-case retrieval requires at least one completed case with "
                "a different case ID in the same workspace. "
                "All answers here concern only the current open case.",
                [],
            )
        lines = [
            "Closed cases in this organisation with relevant contradiction topics "
            "(synthetic demonstration data — not official records):\n"
        ]
        for s in similar:
            match_note = " [topic match]" if s["topic_match"] else ""
            lines.append(f"**{s['case_number']} — {s['title']}** (status: {s['status']}){match_note}")
            for c in s["contradictions"][:3]:
                lines.append(f"  • {c['title']}: {c['description']}")
        lines.append(
            "\nNote: These are synthetic demonstration records. No real legal precedent is cited."
        )
        return "\n".join(lines), []

    # ── score all pages ───────────────────────────────────────────────────────
    candidates = (
        [(p, d) for p, d in all_rows if d.original_filename.casefold() in mentioned_filenames]
        if mentioned_filenames
        else all_rows
    )
    qvec = hashed_vector(question)
    scored = sorted(
        [
            (
                0.65 * lexical_score(question, p.extracted_text)
                + 0.35 * max(cosine_similarity(qvec, hashed_vector(p.extracted_text)), 0),
                p,
                d,
            )
            for p, d in candidates
        ],
        key=lambda x: (-x[0], x[2].original_filename, x[1].page_number),
    )
    # Always include all pages for broad questions; cap at 5 for targeted ones
    top_n = len(scored) if is_broad else 5
    selected = scored[:top_n] if scored else []

    if not selected:
        return (
            "I could not find supporting records for that question in the uploaded case files. "
            "Verify that documents have been uploaded and that extraction completed successfully.",
            [],
        )

    references = _dedup_refs([_ref(p, d) for _, p, d in selected])

    nim_answer = await _nvidia_nim_answer(question, selected)
    if nim_answer is not None:
        return nim_answer, references

    # ── route: report generation notice ──────────────────────────────────────
    if is_report:
        fmt = "DOCX" if "docx" in lowered else "PDF"
        subject = "chronology" if is_timeline else ("contradiction" if is_contradiction else "case summary")
        recs = _extract_records([(p, d) for _, p, d in selected])
        bullets = [
            f"- {k.replace('_', ' ').title()}: {v}. {detail} [{d.original_filename} p.{p.page_number}]"
            for k, v, detail, p, d in recs[:12]
        ]
        body = "\n".join(bullets) if bullets else "(No RECORD entries found in selected pages.)"
        return (
            f"Demonstration {fmt} {subject} report content — attorney review required before any filing.\n\n"
            f"Source-linked observations from extracted pages:\n{body}\n\n"
            f"To download the actual {fmt}, use the Motion Studio export buttons after attorney approval. "
            f"This Copilot response is text-only and does not generate binary files directly.",
            references,
        )

    # ── route: timeline ───────────────────────────────────────────────────────
    if is_timeline:
        db_timeline = list(
            (
                await session.scalars(
                    select(TimelineEventRecord)
                    .join(AnalysisRun, AnalysisRun.id == TimelineEventRecord.analysis_run_id)
                    .where(
                        AnalysisRun.organization_id == organization_id,
                        AnalysisRun.case_id == case_id,
                    )
                    .order_by(TimelineEventRecord.sequence_number)
                )
            ).all()
        )
        recs = _extract_records([(p, d) for _, p, d in selected])
        time_recs = [(k, v, detail, p, d) for k, v, detail, p, d in recs if "time" in k or "date" in k]
        if db_timeline:
            lines = ["Complete chronology from analysed timeline records:\n"]
            for ev in db_timeline:
                ts = ev.event_date or ""
                if ev.event_time:
                    ts = f"{ts} {ev.event_time}".strip()
                src = ""
                if ev.source_document_id:
                    doc_row = next((d for _, d in all_rows if d.id == ev.source_document_id), None)
                    if doc_row:
                        pg_row = next((p for p, d in all_rows if d.id == ev.source_document_id and (ev.source_page_id is None or p.id == ev.source_page_id)), None)
                        if pg_row:
                            src = f" [{doc_row.original_filename} p.{pg_row.page_number}]"
                lines.append(f"• {ts} — {ev.title}: {ev.description}{src}")
            return "\n".join(lines), references
        elif time_recs:
            lines = ["Chronology reconstructed from extracted document records (attorney verification required):\n"]
            for k, v, detail, p, d in time_recs[:15]:
                lines.append(f"• {k.replace('_',' ').title()}: {v} — {detail} [{d.original_filename} p.{p.page_number}]")
            return "\n".join(lines), references
        else:
            return (
                "No timeline records found in the extracted pages. "
                "Run analysis first to generate a structured chronology.",
                references,
            )

    # ── route: contradictions ─────────────────────────────────────────────────
    if is_contradiction:
        db_contradictions = list(
            (
                await session.scalars(
                    select(ContradictionRecord)
                    .join(AnalysisRun, AnalysisRun.id == ContradictionRecord.analysis_run_id)
                    .where(
                        AnalysisRun.organization_id == organization_id,
                        AnalysisRun.case_id == case_id,
                    )
                    .order_by(ContradictionRecord.created_at)
                )
            ).all()
        )
        if db_contradictions:
            lines = ["Source-grounded contradictions detected in this case:\n"]
            for c in db_contradictions:
                sev = getattr(c, "severity", "unknown")
                lines.append(f"**{c.title}** (severity: {sev})")
                lines.append(f"  {c.description}")
                if c.source_a_excerpt:
                    src_a_doc = next((d for _, d in all_rows if d.id == c.source_a_document_id), None) if c.source_a_document_id else None
                    src_a_pg = next((p for p, d in all_rows if d.id == c.source_a_document_id), None) if c.source_a_document_id else None
                    label_a = f" [{src_a_doc.original_filename} p.{src_a_pg.page_number}]" if src_a_doc and src_a_pg else ""
                    lines.append(f"  Source A: {c.source_a_excerpt}{label_a}")
                if c.source_b_excerpt:
                    src_b_doc = next((d for _, d in all_rows if d.id == c.source_b_document_id), None) if c.source_b_document_id else None
                    src_b_pg = next((p for p, d in all_rows if d.id == c.source_b_document_id), None) if c.source_b_document_id else None
                    label_b = f" [{src_b_doc.original_filename} p.{src_b_pg.page_number}]" if src_b_doc and src_b_pg else ""
                    lines.append(f"  Source B: {c.source_b_excerpt}{label_b}")
            lines.append("\nAttorney verification required before any conclusion is drawn.")
            return "\n".join(lines), references
        # Fall back to extractive contradiction detection from RECORD: values
        recs = _extract_records([(p, d) for _, p, d in selected])
        by_key: dict[str, list[tuple[str, str, str, DocumentPage, DocumentRecord]]] = {}
        for rec in recs:
            by_key.setdefault(rec[0], []).append(rec)
        conflicts = {k: v for k, v in by_key.items() if len({r[1] for r in v}) > 1}
        if conflicts:
            lines = ["Extractive contradiction analysis from document RECORD fields (attorney verification required):\n"]
            for key, entries in conflicts.items():
                lines.append(f"**{key.replace('_',' ').title()}** — {len(entries)} differing values:")
                for k, v, detail, p, d in entries:
                    lines.append(
                        f'  \u2022 "{v}" \u2014 {detail}'
                        f" [{d.original_filename} p.{p.page_number}]"
                    )
            return "\n".join(lines), references
        return (
            "No contradictions were detected in the extracted records for this question. "
            "Run analysis to generate structured contradiction records.",
            references,
        )

    # ── route: compare two documents / witnesses ──────────────────────────────
    if is_compare:
        recs = _extract_records([(p, d) for _, p, d in selected])
        by_doc: dict[str, list[tuple[str, str, str, DocumentPage, DocumentRecord]]] = {}
        for rec in recs:
            by_doc.setdefault(rec[4].original_filename, []).append(rec)
        if len(by_doc) < 2:
            # If only one or zero docs, show all records from selected pages
            by_doc = {}
            for _, p, d in selected:
                by_doc.setdefault(d.original_filename, []).extend(
                    _extract_records([(p, d)])
                )
        if len(by_doc) < 2:
            return (
                "At least two documents are needed for a comparison. "
                "Mention the filenames to target specific documents.",
                references,
            )
        lines = ["Comparison of extracted RECORD values across documents:\n"]
        all_keys: set[str] = set()
        for entries in by_doc.values():
            all_keys.update(e[0] for e in entries)
        doc_names = list(by_doc.keys())[:4]
        for key in sorted(all_keys):
            vals_per_doc = {
                name: next((e[1] for e in entries if e[0] == key), "—")
                for name, entries in by_doc.items()
                if name in doc_names
            }
            unique_vals = {v for v in vals_per_doc.values() if v != "—"}
            conflict_marker = " ⚠ DIFFERS" if len(unique_vals) > 1 else ""
            lines.append(f"**{key.replace('_',' ').title()}**{conflict_marker}")
            for name, val in vals_per_doc.items():
                pg_num = next((str(p.page_number) for _, p, d in selected if d.original_filename == name), "?")
                lines.append(f"  • {name} p.{pg_num}: {val}")
        lines.append("\nAttorney must verify all observations against the original documents.")
        return "\n".join(lines), references

    # ── route: single-file summary ────────────────────────────────────────────
    if mentioned_filenames and len(mentioned_filenames) == 1:
        fname = next(iter(mentioned_filenames))
        file_pages = [(p, d) for p, d in all_rows if d.original_filename.casefold() == fname]
        if not file_pages:
            return (
                f'No extracted pages found for "{fname}". '
                "Confirm the file was uploaded and processed successfully.",
                [],
            )
        recs = _extract_records(file_pages)
        refs = _dedup_refs([_ref(p, d) for p, d in file_pages])
        if recs:
            lines = [f"Source-linked summary of {file_pages[0][1].original_filename}:\n"]
            for k, v, detail, p, d in recs:
                lines.append(f"- {k.replace('_',' ').title()}: {v}. {detail} [{d.original_filename} p.{p.page_number}]")
            lines.append("\nAttorney verification required before any conclusion is drawn.")
            return "\n".join(lines), refs
        # No RECORD entries — return raw text excerpts
        excerpts = []
        for p, d in file_pages[:3]:
            text = " ".join(p.extracted_text.split())
            excerpts.append(f"{text[:400]} [{d.original_filename} p.{p.page_number}]")
        return "\n".join(excerpts), refs

    # ── route: full case summary ──────────────────────────────────────────────
    if is_summary:
        recs = _extract_records([(p, d) for _, p, d in selected])
        by_key: dict[str, list[tuple[str, str, str, DocumentPage, DocumentRecord]]] = {}
        for rec in recs:
            by_key.setdefault(rec[0], []).append(rec)
        lines = ["Case summary from extracted source pages (synthetic demonstration — attorney review required):\n"]
        for key, entries in sorted(by_key.items()):
            unique_vals = list({e[1] for e in entries})
            note = " [MULTIPLE VALUES — possible contradiction]" if len(unique_vals) > 1 else ""
            lines.append(f"**{key.replace('_',' ').title()}**{note}")
            for k, v, detail, p, d in entries[:3]:
                lines.append(f"  • {v} — {detail} [{d.original_filename} p.{p.page_number}]")
        if not lines[1:]:
            for _, p, d in selected[:4]:
                text = " ".join(p.extracted_text.split())
                lines.append(f"• {text[:300]} [{d.original_filename} p.{p.page_number}]")
        lines.append("\nNo source, no claim. Attorney must verify every observation.")
        return "\n".join(lines), references

    # ── default: targeted question ────────────────────────────────────────────
    recs = _extract_records([(p, d) for _, p, d in selected])
    relevant_tokens = {t for t in re.findall(r"[a-z0-9-]+", lowered) if len(t) > 3}
    matching = [
        r for r in recs
        if relevant_tokens & set(re.findall(r"[a-z0-9-]+", " ".join(r[:3]).casefold()))
    ]
    chosen = matching[:8] or recs[:8]
    if chosen:
        lead = "The retrieved case records contain these source-linked observations:"
        bullets = [
            f"- {k.replace('_',' ').title()}: {v}. {detail} [{d.original_filename} p.{p.page_number}]"
            for k, v, detail, p, d in chosen
        ]
        answer = f"{lead}\n" + "\n".join(bullets)
        answer += "\n\nAttorney must verify every observation against the originals."
        return answer, references

    # Final fallback: raw text excerpts
    excerpts = []
    for _, p, d in selected[:4]:
        text = " ".join(p.extracted_text.split())
        excerpts.append(f"{text[:300]} [{d.original_filename} p.{p.page_number}]")
    return (
        "Closest extracted page excerpts for your question:\n" + "\n".join(excerpts)
        + "\n\nAttorney verification required.",
        references,
    )
