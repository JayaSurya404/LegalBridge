"""Focused tests for the Phase 2 system API."""

from collections.abc import Generator
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    settings = Settings(
        environment="test",
        cors_origins=["http://localhost:3000"],
    )
    test_client = TestClient(create_app(settings))
    yield test_client
    test_client.close()


def test_root_service_metadata(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    payload = response.json()
    assert payload["service"] == "LegalBridge India API"
    assert payload["version"] == "0.2.0"
    assert payload["environment"] == "test"
    assert payload["api_prefix"] == "/api/v1"
    assert payload["documentation_url"] == "/docs"
    assert "not authorised for automatic court filing" in payload["legal_disclaimer"]


def test_health_endpoint(client: TestClient) -> None:
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["service"] == "LegalBridge India API"
    assert payload["environment"] == "test"
    timestamp = payload["timestamp"].replace("Z", "+00:00")
    assert datetime.fromisoformat(timestamp).tzinfo is not None


def test_request_id_header(client: TestClient) -> None:
    response = client.get("/api/v1/health", headers={"X-Request-ID": "test-request-001"})

    assert response.headers["X-Request-ID"] == "test-request-001"


def test_process_time_header(client: TestClient) -> None:
    response = client.get("/api/v1/health")

    assert float(response.headers["X-Process-Time-Ms"]) >= 0


def test_readiness_is_honest(client: TestClient) -> None:
    response = client.get("/api/v1/ready")

    assert response.status_code == 200
    payload = response.json()
    assert payload["ready"] is True
    assert payload["api"]["status"] == "ready"
    assert payload["storage"]["status"] == "not_configured"


def test_database_is_not_configured(client: TestClient) -> None:
    payload = client.get("/api/v1/ready").json()

    assert payload["database"]["status"] == "not_configured"


def test_ai_is_not_configured(client: TestClient) -> None:
    payload = client.get("/api/v1/ready").json()

    assert payload["ai"]["status"] == "not_configured"


def test_capabilities_endpoint(client: TestClient) -> None:
    response = client.get("/api/v1/capabilities")

    assert response.status_code == 200
    payload = response.json()
    assert payload["health_api"] == "implemented"
    assert payload["legal_research"] == "unavailable"
    assert payload["multi_agent_execution"] == "frontend_simulation_only"
    assert payload["citation_verification"] == "frontend_simulation_only"


def test_document_processing_is_unavailable(client: TestClient) -> None:
    payload = client.get("/api/v1/capabilities").json()

    assert payload["document_processing"] == "unavailable"


def test_automatic_filing_is_prohibited(client: TestClient) -> None:
    payload = client.get("/api/v1/capabilities").json()

    assert payload["automatic_court_filing"] == "prohibited"


def test_localhost_cors(client: TestClient) -> None:
    response = client.get(
        "/api/v1/health",
        headers={"Origin": "http://localhost:3000"},
    )

    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"
