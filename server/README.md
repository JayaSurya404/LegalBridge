# LegalBridge India Phase 3 API

This directory contains the local persistence and authentication backend for the LegalBridge India attorney-assistance prototype. Phase 3 adds organisations, users, roles, rotating authentication sessions, cases, document metadata, and audit events while preserving the Phase 2 system API.

The Next.js frontend remains in deterministic `mock` mode. Real frontend/backend integration has not started.

## Implemented

- Async SQLAlchemy 2.0 engine and sessions.
- SQLite for local development and PostgreSQL-compatible models using UUID strings.
- Alembic-managed schema; application startup never calls `create_all`.
- Organisations and organisation-scoped users with `admin`, `attorney`, and `reviewer` roles.
- Argon2 password hashes, HS256 access tokens, rotating database-backed refresh sessions, token-version invalidation, and guarded production configuration.
- Organisation-isolated case CRUD and archive operations.
- JSON-only PDF, TXT, and DOCX document metadata records.
- Mutation and sign-in audit events.
- Database-aware readiness and honest capability reporting.
- Idempotent synthetic demo bootstrap.

## Deliberately unavailable

There is no binary upload or storage, parsing, OCR, transcription, AI/model integration, RAG, embeddings, pgvector, legal research, statutory or precedent API, backend multi-agent execution, citation verification, motion generation, frontend HTTP integration, digital signature, or court filing.

## Requirements and setup

- Python 3.10 or newer; the verified local environment uses Python 3.12.10.
- Repository-local virtual environment at `server/.venv`.

From the repository root:

```powershell
python -m venv server/.venv
server\.venv\Scripts\python.exe -m pip install -r server\requirements-dev.txt
powershell -ExecutionPolicy Bypass -File .\scripts\init_backend_data.ps1
```

The initialization helper applies Alembic migrations and runs the idempotent demo bootstrap. The default local database is ignored at `server/legalbridge.db`.

## Start

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_backend.ps1
```

Uvicorn starts with reload at `127.0.0.1:8000`.

## Test

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\test_backend.ps1
```

The helper applies Ruff safe fixes, formats Python files, performs the final Ruff check, and runs the focused backend pytest suite.

## Demo accounts

Organisation slug: `legalbridge-demo`

- Admin: `admin@legalbridge.demo` / `LegalBridgeAdmin@2026`
- Attorney: `attorney@legalbridge.demo` / `LegalBridge@2026`

These credentials are synthetic local demonstration data only.

## API

System:

- `GET /`
- `GET /api/v1/health`
- `GET /api/v1/ready`
- `GET /api/v1/capabilities`

Authentication:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/change-password`

Organisation and users:

- `GET /api/v1/organizations/current`
- `GET /api/v1/users`
- `POST /api/v1/users`
- `PATCH /api/v1/users/{user_id}/status`

Cases:

- `GET /api/v1/cases`
- `POST /api/v1/cases`
- `GET /api/v1/cases/{case_id}`
- `PATCH /api/v1/cases/{case_id}`
- `POST /api/v1/cases/{case_id}/archive`

Document metadata and audit:

- `GET /api/v1/cases/{case_id}/documents`
- `POST /api/v1/cases/{case_id}/documents`
- `DELETE /api/v1/cases/{case_id}/documents/{document_id}`
- `GET /api/v1/cases/{case_id}/audit-events`

Documentation:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`
- OpenAPI JSON: `http://127.0.0.1:8000/openapi.json`

## Configuration

Copy `server/.env.example` to ignored `server/.env` only for local overrides. Supported variables include:

- `LEGALBRIDGE_DATABASE_URL`
- `LEGALBRIDGE_SQL_ECHO`
- `LEGALBRIDGE_ACCESS_TOKEN_MINUTES`
- `LEGALBRIDGE_REFRESH_TOKEN_DAYS`
- `LEGALBRIDGE_JWT_ALGORITHM`
- `LEGALBRIDGE_JWT_SECRET`
- Existing Phase 2 application, host, port, CORS, logging, and documentation settings.

The checked-in JWT value is development-only. Production mode rejects that default and requires a private replacement. A future PostgreSQL/Supabase connection must use `postgresql+asyncpg://...`; Phase 3 does not connect to Supabase or any cloud service.
