# LegalBridge India

Problem statement: `SDGGAIP016`

LegalBridge India is an attorney-assistance hackathon prototype aligned with SDG 16.3 and SDG 10.3. The current checkpoint uses this verified data path:

```text
Next.js → FastAPI REST API → async SQLAlchemy → Supabase PostgreSQL
                              ↘ ignored local private binary storage
```

> **Legal disclaimer:** This is not a government service, final legal advice, a replacement for professional judgment, or an automatic court-filing system. Extracted source text is not a legal finding. Every legal output requires independent attorney verification.

- “Autonomous until review, never autonomous at filing.”
- “No source, no legal claim. No lawyer approval, no export.”

## Current capabilities

- Supabase PostgreSQL persistence through an SSL-required IPv4 Session Pooler.
- Existing organisation-scoped Argon2 login, JWT access tokens, rotating refresh tokens, RBAC, and isolation remain in FastAPI; Supabase Auth is not used.
- Alembic-managed organisations, users, auth sessions, cases, documents, extracted pages, and audit events.
- An authenticated, organisation-scoped `GET /api/v1/dashboard/summary` aggregate endpoint.
- Real PDF, DOCX, and TXT validation, ignored private binary storage, SHA-256 computation, extraction, download, reprocessing, and deletion.
- A fully synthetic `legalbridge-main` jury workspace with 5 staff, 16 cases after verification, 50 documents, 184 extracted pages, and over 250 audit events.
- The flagship `LB-MAIN-2026-001` case has eight generated and processed sources.
- The deterministic synthetic legal-analysis walkthrough and its attorney approval/export gate remain separate from extracted data.

Source extraction does **not** create facts, timelines, legal findings, research, citations, strategies, motions, or filing actions.

## Requirements

- Node.js 20.9 or newer
- pnpm 10 or newer
- Python 3.10 or newer
- Repository-local `server/.venv`
- A hosted Supabase PostgreSQL project for the jury dataset

Tesseract remains optional and is not installed globally by this project.

## Configuration

The ignored `client/.env.local` remains:

```dotenv
NEXT_PUBLIC_DATA_MODE=http
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

The ignored `server/.env` holds the SQLAlchemy async pooler URL and backend secrets. It must use values equivalent to:

```dotenv
DATABASE_URL=postgresql+asyncpg://postgres.PROJECT_REF:URL_ENCODED_PASSWORD@SESSION_POOLER:5432/postgres
DATABASE_SSL=require
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=5
DATABASE_POOL_TIMEOUT=30
DATABASE_POOL_RECYCLE=300
```

Never put a database URL, password, access token, service-role key, or other secret in `NEXT_PUBLIC_*` or tracked documentation. Intentional SQLite fallback remains available by setting an explicit `sqlite+aiosqlite://` URL with `DATABASE_SSL=disable`.

## Install, initialize, and run

```powershell
pnpm install
server\.venv\Scripts\python.exe -m pip install -r server\requirements-dev.txt
powershell -ExecutionPolicy Bypass -File .\scripts\init_backend_data.ps1
```

The initializer refuses non-PostgreSQL configuration, applies Alembic migrations, repairs the primary workspace and login, generates and processes 50 synthetic sources, verifies minimum counts, and is idempotent.

Start each service:

```powershell
Set-Location D:\LegalBridge\server
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000

Set-Location D:\LegalBridge
pnpm dev
```

- Frontend: `http://localhost:3000`
- Backend Swagger: `http://127.0.0.1:8000/docs`

## Primary jury login

| Workspace | Email | Password | Role |
| --- | --- | --- | --- |
| `legalbridge-main` | `legalbridge@legalbridge.demo` | `legalbridge@2026` | Admin |

This advertised development account is database-backed. The frontend always calls `POST /api/v1/auth/login`; it does not compare credentials locally. Attorney review PIN for the closed synthetic walkthrough: `2026`.

## Supabase Table Editor

Open the `legalbridge-main` project, choose **Table Editor**, and select the `public` schema. The relevant tables are:

- `organizations`
- `users`
- `auth_sessions`
- `cases`
- `documents`
- `document_pages`
- `audit_events`
- `alembic_version`

Do not expose the `users.password_hash` column in screenshots.

## Verification

```powershell
server\.venv\Scripts\python.exe -m ruff check server\app server\tests server\alembic
server\.venv\Scripts\python.exe -m pytest server\tests -q --basetemp=D:\LegalBridge\.tmp\pytest-final
pnpm check

Set-Location D:\LegalBridge\server
.\.venv\Scripts\python.exe -m app.scripts.verify_main_api
.\.venv\Scripts\python.exe -m app.scripts.verify_main_database
```

The two live verification modules print only safe statuses, IDs, engine identity, revisions, and counts. They never print tokens, password hashes, the database password, or the full connection URL.

See [server/README.md](server/README.md) for backend detail and [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) for the exact verified results.

## Not implemented

Statutory or precedent corpus ingestion, retrieval, embeddings, pgvector, RAG, AI providers, LangGraph, real multi-agent reasoning, Legal Copilot, generated legal analysis from uploaded sources, digital signatures, and court filing remain outside this checkpoint. Automatic filing is prohibited.
