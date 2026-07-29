"""Phase 2 compatibility and Phase 3 readiness tests."""

from datetime import datetime

from tests.conftest import ApiContext


def test_root_service_metadata(context: ApiContext) -> None:
    response = context.client.get("/")

    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "LegalBridge India API"
    assert payload["version"] == "0.3.0"
    assert payload["environment"] == "test"
    assert payload["api_prefix"] == "/api/v1"
    assert payload["documentation_url"] == "/docs"
    assert "not authorised for automatic court filing" in payload["legal_disclaimer"]


def test_health_and_request_metadata(context: ApiContext) -> None:
    response = context.client.get(
        "/api/v1/health",
        headers={"X-Request-ID": "phase3-test-request"},
    )

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "phase3-test-request"
    assert float(response.headers["X-Process-Time-Ms"]) >= 0
    timestamp = response.json()["timestamp"].replace("Z", "+00:00")
    assert datetime.fromisoformat(timestamp).tzinfo is not None


def test_database_readiness(context: ApiContext) -> None:
    response = context.client.get("/api/v1/ready")

    assert response.status_code == 200
    assert response.json() == {
        "ready": True,
        "api": {"status": "ready"},
        "database": {"status": "ready"},
        "storage": {"status": "not_configured"},
        "ai": {"status": "not_configured"},
    }


def test_capability_accuracy(context: ApiContext) -> None:
    payload = context.client.get("/api/v1/capabilities").json()

    for capability in (
        "health_api",
        "database_persistence",
        "authentication",
        "organizations",
        "users",
        "cases",
        "document_metadata",
        "audit_events",
    ):
        assert payload[capability] == "implemented"
    assert payload["binary_storage"] == "unavailable"
    assert payload["document_processing"] == "unavailable"
    assert payload["legal_research"] == "unavailable"
    assert payload["multi_agent_backend"] == "unavailable"
    assert payload["citation_verification"] == "frontend_simulation_only"
    assert payload["motion_generation"] == "unavailable"
    assert payload["automatic_court_filing"] == "prohibited"


def test_localhost_cors(context: ApiContext) -> None:
    response = context.client.options(
        "/api/v1/auth/login",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        },
    )

    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
    assert "POST" in response.headers["access-control-allow-methods"]
