"""Focused regression coverage for review, export, and persisted Copilot routes."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass

from sqlalchemy import func, select

from app.db.base import utc_now
from app.models.analysis import (
    AnalysisRun,
    AttorneyReview,
    CopilotMessage,
    CopilotThread,
    MotionDraft,
    MotionVersion,
)
from app.models.case import LegalCase
from app.models.document import DocumentRecord
from app.models.document_page import DocumentPage
from app.models.organization import Organization
from app.models.user import User
from tests.conftest import ApiContext


@dataclass(frozen=True)
class PlatformIds:
    case_id: str
    motion_id: str
    thread_id: str
    other_thread_id: str


def _create_case(context: ApiContext) -> str:
    response = context.client.post(
        "/api/v1/cases",
        headers=context.access_headers(context.admin_email),
        json={
            "case_number": "PHASE-7-11-RUNTIME",
            "title": "Synthetic runtime regression matter",
            "description": "Synthetic test data only.",
            "status": "active",
            "assigned_attorney_id": context.attorney_id,
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def _seed_platform(context: ApiContext) -> PlatformIds:
    case_id = _create_case(context)

    async def seed() -> PlatformIds:
        database = context.client.app.state.database
        async with database.session_factory() as session:
            organization = (
                await session.scalars(
                    select(Organization).where(Organization.slug == "test-legal-aid")
                )
            ).one()
            admin = (
                await session.scalars(
                    select(User).where(User.email == context.admin_email)
                )
            ).one()
            other_case = (
                await session.scalars(
                    select(LegalCase).where(LegalCase.id == context.other_case_id)
                )
            ).one()
            other_admin = (
                await session.scalars(
                    select(User).where(User.email == context.other_admin_email)
                )
            ).one()
            run = AnalysisRun(
                organization_id=organization.id,
                case_id=case_id,
                status="completed",
                provider="deterministic",
                started_by_user_id=admin.id,
                started_at=utc_now(),
                completed_at=utc_now(),
                summary="Focused synthetic analysis.",
            )
            document = DocumentRecord(
                organization_id=organization.id,
                case_id=case_id,
                original_filename="focused-source.txt",
                content_type="text/plain",
                size_bytes=128,
                sha256="f" * 64,
                category="synthetic test source",
                status="metadata_only",
                extraction_status="processed",
                parser_name="focused-test",
                parser_version="1",
                page_count=1,
                extracted_character_count=62,
                processed_at=utc_now(),
                created_by_id=admin.id,
            )
            session.add_all([run, document])
            await session.flush()
            page = DocumentPage(
                organization_id=organization.id,
                case_id=case_id,
                document_id=document.id,
                page_number=1,
                page_label="Page 1",
                extracted_text=(
                    "Synthetic source page for deterministic Copilot regression testing."
                ),
                character_count=68,
                extraction_method="focused-test",
            )
            motion = MotionDraft(
                organization_id=organization.id,
                case_id=case_id,
                analysis_run_id=run.id,
                title="Focused demonstration motion",
                motion_type="source-grounded_demonstration_motion",
                status="review_required",
                current_version=1,
                created_by_user_id=admin.id,
            )
            thread = CopilotThread(
                organization_id=organization.id,
                case_id=case_id,
                created_by_user_id=admin.id,
                title="Focused Copilot thread",
            )
            other_thread = CopilotThread(
                organization_id=other_case.organization_id,
                case_id=other_case.id,
                created_by_user_id=other_admin.id,
                title="Other organisation thread",
            )
            session.add_all([page, motion, thread, other_thread])
            await session.flush()
            session.add(
                MotionVersion(
                    motion_draft_id=motion.id,
                    version_number=1,
                    content_json={
                        "Demonstration notice": (
                            "Attorney review required; synthetic and not filed."
                        )
                    },
                    rendered_text=(
                        "Demonstration draft — attorney review required — synthetic "
                        "and not filed with any court."
                    ),
                    citation_check_status="passed_synthetic_sources",
                    ethics_check_status="passed_with_attorney_review",
                    created_by_user_id=admin.id,
                )
            )
            await session.commit()
            return PlatformIds(
                case_id=case_id,
                motion_id=motion.id,
                thread_id=thread.id,
                other_thread_id=other_thread.id,
            )

    return asyncio.run(seed())


def test_approval_persists_and_unlocks_pdf_and_docx(context: ApiContext) -> None:
    ids = _seed_platform(context)
    headers = context.access_headers(context.attorney_email)
    response = context.client.post(
        f"/api/v1/cases/{ids.case_id}/motions/{ids.motion_id}/review",
        headers=headers,
        json={
            "decision": "approved",
            "comments": "Focused internal approval only.",
            "review_pin": "2026",
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "approved"
    pdf = context.client.get(
        f"/api/v1/cases/{ids.case_id}/motions/{ids.motion_id}/export/pdf",
        headers=headers,
    )
    assert pdf.status_code == 200
    assert pdf.headers["content-type"].startswith("application/pdf")

    docx = context.client.get(
        f"/api/v1/cases/{ids.case_id}/motions/{ids.motion_id}/export/docx",
        headers=headers,
    )
    assert docx.status_code == 200
    assert "wordprocessingml.document" in docx.headers["content-type"]

    async def assert_persisted() -> None:
        database = context.client.app.state.database
        async with database.session_factory() as session:
            review_count = await session.scalar(
                select(func.count())
                .select_from(AttorneyReview)
                .where(
                    AttorneyReview.motion_draft_id == ids.motion_id,
                    AttorneyReview.decision == "approved",
                    AttorneyReview.review_pin_verified.is_(True),
                )
            )
            assert review_count == 1

    asyncio.run(assert_persisted())


def test_invalid_review_pin_is_controlled(context: ApiContext) -> None:
    ids = _seed_platform(context)
    response = context.client.post(
        f"/api/v1/cases/{ids.case_id}/motions/{ids.motion_id}/review",
        headers=context.access_headers(context.reviewer_email),
        json={
            "decision": "approved",
            "comments": "Must not be persisted.",
            "review_pin": "0000",
        },
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "invalid_review_pin"


def test_new_motion_version_flushes_id_and_invalidates_approval(
    context: ApiContext,
) -> None:
    ids = _seed_platform(context)
    headers = context.access_headers(context.admin_email)
    approved = context.client.post(
        f"/api/v1/cases/{ids.case_id}/motions/{ids.motion_id}/review",
        headers=headers,
        json={
            "decision": "approved",
            "comments": "Version one reviewed.",
            "review_pin": "2026",
        },
    )
    assert approved.status_code == 200

    response = context.client.post(
        f"/api/v1/cases/{ids.case_id}/motions/{ids.motion_id}/versions",
        headers=headers,
        json={
            "content_json": {
                "Factual background": "Revised source-linked factual background."
            },
            "rendered_text": "Factual background\nRevised source-linked factual background.",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "draft"
    assert payload["current_version"] == 2
    latest = payload["versions"][-1]
    assert latest["id"]
    assert latest["citation_check_status"] == "pending"
    assert latest["ethics_check_status"] == "pending"
    export = context.client.get(
        f"/api/v1/cases/{ids.case_id}/motions/{ids.motion_id}/export/pdf",
        headers=headers,
    )
    assert export.status_code == 409


def test_copilot_persists_serializable_user_and_assistant_messages(
    context: ApiContext,
) -> None:
    ids = _seed_platform(context)
    response = context.client.post(
        f"/api/v1/cases/{ids.case_id}/copilot/threads/{ids.thread_id}/messages",
        headers=context.access_headers(context.admin_email),
        json={"content": "Summarise this case."},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["user_message"]["role"] == "user"
    assert payload["assistant_message"]["role"] == "assistant"
    references = payload["assistant_message"]["source_references_json"]
    assert isinstance(references, list)
    assert references and isinstance(references[0], dict)
    assert isinstance(references[0]["label"], str)

    async def assert_persisted() -> None:
        database = context.client.app.state.database
        async with database.session_factory() as session:
            roles = list(
                (
                    await session.scalars(
                        select(CopilotMessage.role)
                        .where(CopilotMessage.thread_id == ids.thread_id)
                        .order_by(CopilotMessage.created_at)
                    )
                ).all()
            )
            assert roles == ["user", "assistant"]

    asyncio.run(assert_persisted())


def test_copilot_thread_organization_isolation(context: ApiContext) -> None:
    ids = _seed_platform(context)
    response = context.client.post(
        (
            f"/api/v1/cases/{context.other_case_id}/copilot/threads/"
            f"{ids.other_thread_id}/messages"
        ),
        headers=context.access_headers(context.admin_email),
        json={"content": "This must not cross organisations."},
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "copilot_thread_not_found"
