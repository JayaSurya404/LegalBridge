# LegalBridge India current state

Updated: 2026-07-29

Repository: `D:\LegalBridge`

Branch: `main`
Checkpoint: hosted Supabase PostgreSQL persistence and large synthetic jury dataset verified

## Product and architecture boundary

The verified runtime path is:

```text
Next.js frontend
→ FastAPI REST API
→ async SQLAlchemy
→ Supabase PostgreSQL (SSL-required Session Pooler)
```

Supabase is only the hosted PostgreSQL database. Existing FastAPI Argon2 authentication, JWT access tokens, rotating refresh tokens, RBAC, and organisation isolation remain authoritative. The frontend has no database password, connection URL, service-role key, access token, or direct database access.

Original document binaries remain in ignored local private storage. PostgreSQL stores document metadata, authoritative SHA-256 values, extraction status, and extracted pages.

The deterministic legal-analysis walkthrough remains closed synthetic fixture data. No corpus, retrieval, embeddings, pgvector, RAG, model provider, LangGraph, real agent reasoning, generated legal analysis, digital signature, or filing phase was started.

## Hosted project

- Project: `legalbridge-main` (created, healthy)
- Project reference: `scww…ovlm`
- Region: South Asia (Mumbai), `ap-south-1`
- Pooler: `aws***-1.pooler.supabase.com:5432`
- Engine: PostgreSQL 17.6
- Database/schema: `postgres` / `public`
- Alembic head: `0003_postgresql`
- Connection configuration: ignored `server/.env`, SSL required, bounded pool settings
- SQLite fallback: preserved and available only through an explicit SQLite URL with SSL disabled

## Jury workspace

- Organisation: `LegalBridge Main Jury Workspace`
- Slug: `legalbridge-main`
- Organisation ID: `c1651c9e-2185-444d-8fb7-45ce72017c7f`
- Primary user ID: `623a9c07-357c-44ab-be50-be18e4b459a6`
- Primary login: `legalbridge@legalbridge.demo` / `legalbridge@2026`
- Role: admin
- Supporting staff: 4 (two attorneys, one reviewer, one additional admin)

The primary password is stored only as an Argon2 hash. Supporting passwords are random and are not advertised.

## Seed and persistence results

The first and second initializer runs produced identical seeded totals:

- Cases: 15
- Documents: 50
- Extracted source pages: 184
- Audit events: 251
- Flagship documents: 8
- Staff users: 5 total

The browser then created exactly one additional case:

- `LB-MAIN-LOCAL-VERIFY-001`
- `Supabase Persistence Verification`
- PostgreSQL ID: `355588df-e8dc-4426-bdbf-20cdd200e1e0`

Final safe SQL counts after API/browser verification:

| Table | Rows |
| --- | ---: |
| `organizations` | 1 |
| `users` | 5 |
| `auth_sessions` | 12 at the captured SQL check |
| `cases` | 16 |
| `documents` | 50 |
| `document_pages` | 184 |
| `audit_events` | 264 at the captured SQL check |

Auth-session and audit counts continue to grow with subsequent login/logout verification.

## Flagship case

`LB-MAIN-2026-001`, **Comprehensive Synthetic Defence Demonstration**, is active and has eight processed synthetic originals:

1. Multi-page PDF court transcript
2. DOCX police report
3. TXT arrest memo
4. PDF witness statement
5. DOCX seizure record
6. TXT medical observation
7. PDF identification-procedure record
8. DOCX electronic-evidence inventory

All binaries were generated as valid files, visibly marked fictional, passed through private storage and real extraction, and produced 30 source pages for the flagship case.

## API verification

`python -m app.scripts.verify_main_api` safely verified:

- Login: HTTP 200; access and refresh tokens returned but never printed
- `/auth/me`: HTTP 200; primary email; admin role
- Cases: 16, including one and only one persistence-verification case
- Dashboard: 16 cases, 50 documents, 184 pages, more than 250 audits
- Flagship documents: 8
- Document detail: real extracted pages returned
- Original download: HTTP 200 with non-empty original bytes
- Refresh rotation: HTTP 200
- Old refresh-token reuse: HTTP 401
- Logout: HTTP 204
- Revoked refresh-token reuse: HTTP 401

The clean backend was restarted after the frontend-created case. A new process on port 8000 returned the same 16 cases and the verification case exactly once.

## Frontend verification

Chrome verified:

- Primary login reached FastAPI and displayed the admin role.
- Dashboard displayed PostgreSQL aggregates: 16 total cases, 5 active, 50 documents, 50 processed, 184 pages, and live audit totals.
- Cases displayed all seeded records plus the single verification case.
- The flagship used its real PostgreSQL ID.
- Documents displayed eight real records and 30 pages for the flagship.
- The source viewer opened persisted logical DOCX sections.
- Browser refresh restored the session.
- Backend restart preserved the session and verification case.
- Frontend restart preserved the session and verification case.
- Frontend logout returned to sign-in successfully.
- The verified dashboard was reopened for handoff.

A localhost issue found during verification was fixed: Next.js now permits the `127.0.0.1` development origin, both localhost origins are allowed by FastAPI CORS, and the sign-in form uses a POST fallback so credentials cannot enter a query string if JavaScript is unavailable.

## Supabase Table Editor

The authenticated Table Editor visibly confirmed the `public` schema and these tables:

- `alembic_version`
- `organizations`
- `users`
- `auth_sessions`
- `cases`
- `documents`
- `document_pages`
- `audit_events`

Do not expose the `users.password_hash` column in screenshots.

## Commands

Initialize or repair hosted data:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\init_backend_data.ps1
```

Start the backend:

```powershell
Set-Location D:\LegalBridge\server
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Start the frontend:

```powershell
Set-Location D:\LegalBridge
pnpm dev
```

Safe live verification:

```powershell
Set-Location D:\LegalBridge\server
.\.venv\Scripts\python.exe -m app.scripts.verify_main_api
.\.venv\Scripts\python.exe -m app.scripts.verify_main_database
```

## Final automated checks

- Ruff: passed, `All checks passed!`
- Backend pytest: 31 tests passed after the new hosted-configuration, aggregate, bootstrap, and isolation tests
- Frontend type-check: passed
- Frontend lint: passed with zero warnings
- Frontend production build: passed with Next.js 16.2.12
- `pnpm check`: passed
- Alembic: `0003_postgresql (head)` on Supabase
- Initializer rerun: identical counts, no duplicates

## Repository safety

- Repository root, `.git`, branch `main`, history, and `origin` were preserved.
- Existing SQLite database and uploaded documents were not deleted.
- `server/.env`, `client/.env.local`, private storage, databases, virtual environments, generated binaries, logs, caches, and Supabase credentials remain ignored.
- No stage, commit, push, pull, merge, rebase, branch change, or remote change occurred.
