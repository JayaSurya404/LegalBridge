# LegalBridge India current state

Updated: 2026-07-29

Repository: `D:\LegalBridge`

Branch: `main`

Checkpoint: final combined Phase 7–11 implementation

## Architecture

```text
Next.js frontend
→ authenticated FastAPI
→ async SQLAlchemy
→ Supabase PostgreSQL (SSL-required pooler)
```

The frontend uses the existing session client and Zustand store. In HTTP mode
all backend cases use FastAPI data; frontend-only analysis fixtures are
disabled. Supabase credentials remain server-only.

## Persisted platform

Migration `0004_phase7_11` adds analysis runs, 13 agent runs, facts, timeline,
contradictions, procedural findings, synthetic authorities/chunks, research,
strategies, ethics, motion drafts/versions, citation checks, attorney reviews,
and Copilot threads/messages.

The default deterministic provider uses stored document pages, source
references, templates, lexical matching, and hashed-vector cosine similarity.
No paid AI API or pgvector is required. Cases without extracted pages receive
an honest insufficient-source state and no invented findings.

The flagship `LB-MAIN-2026-001` bootstrap targets:

- 1 completed run and 13 completed agents
- 20 facts, 15 timeline events, 8 contradictions
- 6 potential procedural-gap findings
- 20+ synthetic authorities and 10 ranked results
- 6 strategies and 4 ethics findings
- 1 motion, 2+ versions, citation/ethics checks
- changes-requested and approved internal reviews
- 1 Copilot thread and 5+ messages

Every authority is prominently synthetic and not official law. Motion approval
is internal only, not a court signature. No automatic filing exists.

## Commands

Apply the schema and seed only Phase 7–11 data:

```powershell
Set-Location D:\LegalBridge\server
.\.venv\Scripts\alembic.exe upgrade head
.\.venv\Scripts\python.exe -m app.scripts.bootstrap_phase7_11
```

Backend:

```powershell
Set-Location D:\LegalBridge\server
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
Set-Location D:\LegalBridge
pnpm dev
```

Jury login: `legalbridge-main` /
`legalbridge@legalbridge.demo` / `legalbridge@2026`.

## Production limitations

Dockerfiles and a production compose example are present but nothing is
deployed. Local private binaries are not durable on serverless filesystems;
production requires private persistent object storage. It also requires secret
rotation, a production review identity mechanism, official verified-authority
ingestion, monitoring, backups, and full security/legal review.

Synthetic demonstration data. Not legal advice. Attorney verification
required. No automatic court filing.
