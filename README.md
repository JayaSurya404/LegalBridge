# LegalBridge India

LegalBridge India (`SDGGAIP016`) is a synthetic attorney-assistance hackathon
prototype:

```text
Next.js → authenticated FastAPI → async SQLAlchemy → Supabase PostgreSQL
                                      ↘ private document storage
```

> Synthetic demonstration data. Not legal advice. Attorney verification is
> required. No automatic court filing exists.

The operating rules are “No source, no legal claim” and “Autonomous until
review, never autonomous at filing.”

## Complete platform

- Organisation-scoped Argon2 login, JWT/refresh rotation, RBAC, cases,
  documents, extracted pages, and append-oriented audit events.
- A deterministic 13-agent backend workflow producing persisted facts,
  timelines, source-to-source contradictions, potential procedural gaps,
  strategy, ethics controls, and attorney-review work.
- A 20-record fictional authority corpus. Every seeded item is
  `is_synthetic=true` and `source_status=synthetic_demo`; none is official or
  binding law.
- Lexical retrieval plus deterministic hashed-vector cosine scoring without
  pgvector.
- Citation Firewall, Ethics Auditor, structured motion drafts, version history,
  backend PIN review, and authenticated PDF/DOCX export.
- A persisted case-aware Legal Copilot that uses case/database sources and says
  “The available case sources do not establish this.” when support is missing.
- All case tabs hydrate through FastAPI in HTTP mode; backend cases do not use
  frontend analysis fixtures.

## Configuration

`client/.env.local`:

```dotenv
NEXT_PUBLIC_DATA_MODE=http
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Copy `server/.env.example` to ignored `server/.env`. For Supabase, use an
SSL-required async SQLAlchemy pooler URL:

```dotenv
DATABASE_URL=postgresql+asyncpg://postgres.PROJECT_REF:URL_ENCODED_PASSWORD@SESSION_POOLER:5432/postgres
DATABASE_SSL=require
LEGALBRIDGE_ANALYSIS_PROVIDER=deterministic
```

Never place database credentials or privileged keys in `NEXT_PUBLIC_*`.

## Schema and flagship data

```powershell
Set-Location D:\LegalBridge\server
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\python.exe -m app.scripts.bootstrap_phase7_11
```

The Phase 7–11 bootstrap only adds/repairs the new analysis demonstration data;
it does not regenerate the existing 50 documents. It is idempotent for
`LB-MAIN-2026-001`.

## Start commands

```powershell
Set-Location D:\LegalBridge\server
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000

Set-Location D:\LegalBridge
pnpm dev
```

Frontend: `http://localhost:3000`. API docs:
`http://127.0.0.1:8000/docs`.

Jury login: workspace `legalbridge-main`, email
`legalbridge@legalbridge.demo`, password `legalbridge@2026`, role `admin`.
Development review PIN: `2026` (validated only by the backend).

## Deployment readiness and limits

`server/Dockerfile`, `client/Dockerfile`, and
`docker-compose.production.yml` are provided as lightweight readiness assets;
this repository does not deploy automatically. Local document binaries are not
durable on serverless filesystems. Production requires private persistent
object storage, secret rotation, a non-demo review mechanism, verified official
authority ingestion, backups, monitoring, and a full security/legal review.
Internal approval is not a digital court signature.

See [server/README.md](server/README.md) and
[docs/CURRENT_STATE.md](docs/CURRENT_STATE.md).
