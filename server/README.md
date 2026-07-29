# LegalBridge India API foundation

This directory contains the Phase 2 FastAPI foundation for LegalBridge India. It provides service metadata, health, readiness, capability reporting, request tracing, safe structured errors, localhost CORS, and focused tests.

The Next.js frontend remains in deterministic `mock` mode. Its HTTP adapter is not activated.

## Implemented

- FastAPI application factory and exported application instance.
- Versioned `/api/v1` router.
- Root metadata, health, readiness, and capability endpoints.
- Swagger UI, ReDoc, and OpenAPI JSON when documentation is enabled.
- `X-Request-ID` and `X-Process-Time-Ms` response headers.
- Structured application, request-validation, HTTP, and unexpected-error responses.
- Standard Python request logging.
- Pydantic Settings configuration with the `LEGALBRIDGE_` prefix and optional `server/.env`.
- CORS for `http://localhost:3000`.

## Not implemented

There is no authentication, database, Supabase, storage, document upload or processing, OCR, AI/model integration, RAG, legal research, multi-agent backend execution, citation verification, streaming, or court filing. The readiness and capability endpoints report these boundaries explicitly.

## Requirements

- Python 3.10 or newer.
- A virtual environment at `server/.venv`.

## Setup

From the repository root:

```powershell
python -m venv server/.venv
server\.venv\Scripts\python.exe -m pip install -r server\requirements-dev.txt
```

Copy `server/.env.example` to `server/.env` only when local overrides are needed. Do not add secrets.

## Start

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_backend.ps1
```

The helper starts Uvicorn with reload at `127.0.0.1:8000`.

## Test

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\test_backend.ps1
```

The helper runs Ruff once and the focused backend pytest suite once, stopping on failure.

## URLs

- Service metadata: `http://127.0.0.1:8000/`
- Health: `http://127.0.0.1:8000/api/v1/health`
- Readiness: `http://127.0.0.1:8000/api/v1/ready`
- Capabilities: `http://127.0.0.1:8000/api/v1/capabilities`
- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

## Configuration

Supported environment variables:

- `LEGALBRIDGE_APP_NAME`
- `LEGALBRIDGE_ENVIRONMENT`
- `LEGALBRIDGE_API_V1_PREFIX`
- `LEGALBRIDGE_HOST`
- `LEGALBRIDGE_PORT`
- `LEGALBRIDGE_CORS_ORIGINS` as a JSON array
- `LEGALBRIDGE_LOG_LEVEL`
- `LEGALBRIDGE_DOCS_ENABLED`
