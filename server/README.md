# LegalBridge FastAPI service

FastAPI owns authentication, organisation isolation, Supabase/PostgreSQL
persistence, private document access, deterministic analysis, motion review,
exports, Copilot, and auditing. The frontend never connects directly to
Supabase.

## Database

Alembic is the only schema-creation mechanism; startup never calls
`create_all`. Revisions:

1. `0001_phase3`
2. `0002_phase5_6`
3. `0003_postgresql`
4. `0004_phase7_11`

Configure an SSL-required `postgresql+asyncpg` URL in ignored `server/.env`.
The explicit SQLite fallback remains supported for development. Run:

```powershell
Set-Location D:\LegalBridge\server
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\python.exe -m app.scripts.bootstrap_phase7_11
```

The second command is idempotent, affects only Phase 7–11 records, and does not
regenerate stored documents.

## Analysis

`ANALYSIS_PROVIDER=deterministic` is the functional default. A stable provider
interface reserves a future AI implementation without changing storage or API
contracts. The deterministic engine operates on extracted document pages,
metadata, source references, templates, lexical overlap, and SHA-256-based
vectors. Missing sources produce an explicit insufficient-source result and no
findings.

Thirteen persisted agents cover intake, document quality, facts, timeline,
contradictions, procedural audit, research, applicability, strategy, ethics,
citation review, motion outline, and supervision.

The synthetic authority corpus contains at least 20 fictional items and
multiple chunks per item. Every seeded authority is `synthetic_demo`; an LLM is
never treated as a source of law.

## API groups

- `/api/v1/cases/{case_id}/analysis-runs` and `/analysis-summary`
- facts, timeline, contradictions, procedural findings, research, strategies,
  and ethics findings under the case
- `/api/v1/legal-authorities`
- `/api/v1/cases/{case_id}/motions` including versions, checks, review, PDF,
  and DOCX
- `/api/v1/cases/{case_id}/copilot/threads`
- existing case, document, dashboard, auth, source-page, and audit routes

All routes require FastAPI authentication and filter by the principal’s
organisation. Admins/attorneys run analysis and draft; reviewers may view and
record reviews. PIN `2026` is development-only and checked in FastAPI.

## Start

```powershell
Set-Location D:\LegalBridge\server
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Health: `/api/v1/health`; readiness: `/api/v1/ready`.

## Production boundary

The Dockerfile is readiness scaffolding, not a deployment. Ignored local
document storage must be replaced with private durable object storage for
serverless or multi-instance production. Rotate secrets and the review PIN,
disable docs, use verified official authorities, and complete security/legal
review. There is no automatic court-filing endpoint or digital court signature.
