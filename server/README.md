# LegalBridge India FastAPI service

This service owns LegalBridge authentication, organisation isolation, persistence, private document ingestion, and the REST boundary. The active jury configuration uses Supabase PostgreSQL only as a hosted database:

```text
Next.js → FastAPI → SQLAlchemy asyncpg → Supabase PostgreSQL
```

The frontend never receives SQL credentials or Supabase privileged keys. Supabase Auth is not used.

## Database configuration

Copy `server/.env.example` to ignored `server/.env` and provide an SSL-required SQLAlchemy async URL for the Supabase IPv4 Session Pooler:

```dotenv
DATABASE_URL=postgresql+asyncpg://postgres.PROJECT_REF:URL_ENCODED_PASSWORD@SESSION_POOLER:5432/postgres
DATABASE_SSL=require
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=5
DATABASE_POOL_TIMEOUT=30
DATABASE_POOL_RECYCLE=300
```

The PostgreSQL engine uses `pool_pre_ping`, bounded pooling, and async sessions. Normal application startup never calls `create_all` and never silently falls back if PostgreSQL fails.

For an intentional local SQLite fallback:

```dotenv
DATABASE_URL=sqlite+aiosqlite:///./legalbridge.db
DATABASE_SSL=disable
```

SQLite foreign-key PRAGMA handling is applied only to SQLite. Existing `server/legalbridge.db` and existing uploads are preserved.

## Schema and initialization

Alembic revisions are the schema source of truth:

1. `0001_phase3`
2. `0002_phase5_6`
3. `0003_postgresql`

From the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\init_backend_data.ps1
```

The command:

1. Confirms the active settings use PostgreSQL.
2. Prints only a masked database host.
3. verifies and upgrades Alembic to head.
4. Creates or repairs `LegalBridge Main Jury Workspace` (`legalbridge-main`).
5. Creates or repairs the Argon2-backed primary admin and four supporting fictional staff.
6. Seeds 15 numbered jury cases and 50 valid synthetic PDF/DOCX/TXT binaries.
7. Stores originals in ignored local private storage and persists metadata/pages to PostgreSQL.
8. Checks minimum case, document, page, audit, and flagship counts.
9. Produces the same totals on repeat execution.

## Primary development account

- Workspace: `legalbridge-main`
- Email: `legalbridge@legalbridge.demo`
- Password: `legalbridge@2026`
- Role: `admin`

The password is hashed with the existing Argon2 service. Password repair increments token version and revokes active refresh sessions. Supporting users receive random non-advertised passwords.

## APIs

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/cases`
- `POST /api/v1/cases`
- `GET /api/v1/dashboard/summary`
- `GET /api/v1/cases/{case_id}/documents`
- `POST /api/v1/cases/{case_id}/documents/upload`
- `GET /api/v1/cases/{case_id}/documents/{document_id}`
- `GET /api/v1/cases/{case_id}/documents/{document_id}/download`
- `POST /api/v1/cases/{case_id}/documents/{document_id}/reprocess`
- `DELETE /api/v1/cases/{case_id}/documents/{document_id}`
- `GET /api/v1/cases/{case_id}/audit-events`

The dashboard endpoint performs grouped SQL aggregates and limits recent organisation-scoped audit events. It does not load all rows to count them.

## Private storage boundary

Original binaries remain under ignored `server/data/uploads`:

```text
{organization_id}/{case_id}/{document_id}/original.{extension}
```

Only metadata, authoritative SHA-256 values, processing state, and extracted pages are in Supabase PostgreSQL. Storage paths, passwords, tokens, database URLs, and full extracted text never enter audit metadata.

## Start and verify

```powershell
Set-Location D:\LegalBridge\server
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
.\.venv\Scripts\python.exe -m app.scripts.verify_main_api
.\.venv\Scripts\python.exe -m app.scripts.verify_main_database
```

Automated checks from the repository root:

```powershell
server\.venv\Scripts\python.exe -m ruff check server\app server\tests server\alembic
server\.venv\Scripts\python.exe -m pytest server\tests -q --basetemp=D:\LegalBridge\.tmp\pytest-final
```

## Not implemented

There is no corpus ingestion, retrieval, embeddings, pgvector, RAG, model provider, LangGraph execution, real backend multi-agent reasoning, generated legal analysis, digital signature, or court filing in this checkpoint.
