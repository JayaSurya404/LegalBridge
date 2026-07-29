"""Run a token-safe live verification of the hosted jury API."""

from __future__ import annotations

import json

import httpx

from app.scripts.bootstrap_main import (
    MAIN_ORGANIZATION_SLUG,
    PRIMARY_EMAIL,
    PRIMARY_PASSWORD,
)

API_BASE_URL = "http://127.0.0.1:8000/api/v1"


def main() -> None:
    with httpx.Client(base_url=API_BASE_URL, timeout=30) as client:
        login = client.post(
            "/auth/login",
            json={
                "organization_slug": MAIN_ORGANIZATION_SLUG,
                "email": PRIMARY_EMAIL,
                "password": PRIMARY_PASSWORD,
            },
        )
        login.raise_for_status()
        tokens = login.json()
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}

        me = client.get("/auth/me", headers=headers)
        cases_response = client.get("/cases", headers=headers)
        summary_response = client.get("/dashboard/summary", headers=headers)
        me.raise_for_status()
        cases_response.raise_for_status()
        summary_response.raise_for_status()
        user = me.json()
        cases = cases_response.json()
        summary = summary_response.json()

        flagship = next(
            legal_case for legal_case in cases if legal_case["case_number"] == "LB-MAIN-2026-001"
        )
        verification_cases = [
            legal_case
            for legal_case in cases
            if legal_case["case_number"] == "LB-MAIN-LOCAL-VERIFY-001"
        ]
        documents_response = client.get(
            f"/cases/{flagship['id']}/documents",
            headers=headers,
        )
        documents_response.raise_for_status()
        documents = documents_response.json()
        detail = client.get(
            f"/cases/{flagship['id']}/documents/{documents[0]['id']}",
            headers=headers,
        )
        download = client.get(
            f"/cases/{flagship['id']}/documents/{documents[0]['id']}/download",
            headers=headers,
        )
        detail.raise_for_status()
        download.raise_for_status()

        rotated = client.post(
            "/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        rotated.raise_for_status()
        rotated_tokens = rotated.json()
        old_reuse = client.post(
            "/auth/refresh",
            json={"refresh_token": tokens["refresh_token"]},
        )
        logout = client.post(
            "/auth/logout",
            json={"refresh_token": rotated_tokens["refresh_token"]},
        )
        logout.raise_for_status()
        revoked_reuse = client.post(
            "/auth/refresh",
            json={"refresh_token": rotated_tokens["refresh_token"]},
        )

    result = {
        "login_status": login.status_code,
        "access_token_returned": bool(tokens["access_token"]),
        "refresh_token_returned": bool(tokens["refresh_token"]),
        "me_status": me.status_code,
        "me_email": user["email"],
        "me_role": user["role"],
        "organization_id": user["organization_id"],
        "case_count": len(cases),
        "verification_case_count": len(verification_cases),
        "dashboard_cases": summary["total_cases"],
        "dashboard_documents": summary["total_documents"],
        "dashboard_pages": summary["extracted_source_pages"],
        "dashboard_audits": summary["total_audit_events"],
        "flagship_documents": len(documents),
        "detail_pages": len(detail.json()["pages"]),
        "download_status": download.status_code,
        "download_bytes": len(download.content),
        "refresh_status": rotated.status_code,
        "old_refresh_reuse_status": old_reuse.status_code,
        "logout_status": logout.status_code,
        "revoked_refresh_reuse_status": revoked_reuse.status_code,
    }
    print(json.dumps(result, sort_keys=True))


if __name__ == "__main__":
    main()
