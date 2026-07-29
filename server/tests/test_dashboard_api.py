"""Focused dashboard aggregate and organisation-isolation tests."""

from tests.conftest import ApiContext


def _create_case(context: ApiContext, case_number: str, status: str) -> dict[str, object]:
    response = context.client.post(
        "/api/v1/cases",
        headers=context.access_headers(context.admin_email),
        json={
            "case_number": case_number,
            "title": f"Synthetic {status} dashboard matter",
            "status": status,
            "assigned_attorney_id": context.attorney_id,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_dashboard_summary_aggregates_current_organization(context: ApiContext) -> None:
    active_case = _create_case(context, "DASH-ACTIVE-001", "active")
    _create_case(context, "DASH-REVIEW-001", "review")
    document = context.client.post(
        f"/api/v1/cases/{active_case['id']}/documents",
        headers=context.access_headers(context.attorney_email),
        json={
            "original_filename": "synthetic-dashboard-source.txt",
            "content_type": "text/plain",
            "size_bytes": 128,
            "sha256": "d" * 64,
            "category": "synthetic source",
        },
    )
    assert document.status_code == 201

    response = context.client.get(
        "/api/v1/dashboard/summary",
        headers=context.access_headers(context.reviewer_email),
    )

    assert response.status_code == 200
    summary = response.json()
    assert summary["total_cases"] == 2
    assert summary["active_cases"] == 1
    assert summary["review_cases"] == 1
    assert summary["total_documents"] == 1
    assert summary["processed_documents"] == 0
    assert summary["extracted_source_pages"] == 0
    assert summary["total_audit_events"] >= 3
    assert len(summary["recent_audit_events"]) <= 10


def test_dashboard_summary_does_not_include_other_organization(
    context: ApiContext,
) -> None:
    response = context.client.get(
        "/api/v1/dashboard/summary",
        headers=context.access_headers(
            context.other_admin_email,
            organization_slug="other-legal-aid",
        ),
    )

    assert response.status_code == 200
    summary = response.json()
    assert summary["total_cases"] == 1
    assert summary["total_documents"] == 0
    assert summary["total_audit_events"] == 1
    assert all(event["case_id"] is None for event in summary["recent_audit_events"])
