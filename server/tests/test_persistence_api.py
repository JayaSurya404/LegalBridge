"""Focused case, document metadata, audit, and isolation tests."""

from tests.conftest import ApiContext


def _create_case(context: ApiContext) -> dict[str, object]:
    response = context.client.post(
        "/api/v1/cases",
        headers=context.access_headers(context.admin_email),
        json={
            "case_number": "TEST-CASE-001",
            "title": "Synthetic test matter",
            "description": "No real client or legal data.",
            "status": "active",
            "assigned_attorney_id": context.attorney_id,
        },
    )
    assert response.status_code == 201
    return response.json()


def test_case_creation_and_reviewer_access(context: ApiContext) -> None:
    legal_case = _create_case(context)
    response = context.client.get(
        f"/api/v1/cases/{legal_case['id']}",
        headers=context.access_headers(context.reviewer_email),
    )

    assert legal_case["organization_id"]
    assert legal_case["assigned_attorney_id"] == context.attorney_id
    assert response.status_code == 200
    assert response.json()["case_number"] == "TEST-CASE-001"


def test_document_metadata_and_duplicate_sha_rejection(context: ApiContext) -> None:
    legal_case = _create_case(context)
    headers = context.access_headers(context.attorney_email)
    metadata = {
        "original_filename": "synthetic-evidence.pdf",
        "content_type": "application/pdf",
        "size_bytes": 4096,
        "sha256": "a" * 64,
        "category": "synthetic evidence",
    }
    created = context.client.post(
        f"/api/v1/cases/{legal_case['id']}/documents",
        headers=headers,
        json=metadata,
    )
    duplicate = context.client.post(
        f"/api/v1/cases/{legal_case['id']}/documents",
        headers=headers,
        json=metadata,
    )

    assert created.status_code == 201
    assert created.json()["status"] == "metadata_only"
    assert "content" not in created.json()
    assert duplicate.status_code == 409
    assert duplicate.json()["error"]["code"] == "duplicate_document_sha256"


def test_case_audit_events_are_persisted_newest_first(context: ApiContext) -> None:
    legal_case = _create_case(context)
    headers = context.access_headers(context.admin_email)
    context.client.patch(
        f"/api/v1/cases/{legal_case['id']}",
        headers=headers,
        json={"title": "Updated synthetic matter"},
    )
    response = context.client.get(
        f"/api/v1/cases/{legal_case['id']}/audit-events",
        headers=headers,
    )

    assert response.status_code == 200
    events = response.json()
    assert [event["event_type"] for event in events[:2]] == [
        "case_update",
        "case_creation",
    ]
    assert all(event["case_id"] == legal_case["id"] for event in events)


def test_cross_organization_case_access_returns_404(context: ApiContext) -> None:
    response = context.client.get(
        f"/api/v1/cases/{context.other_case_id}",
        headers=context.access_headers(context.admin_email),
    )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "case_not_found"
