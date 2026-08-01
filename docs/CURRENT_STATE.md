# LegalBridge India current state

Updated: 2026-08-01

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

## Deployed casework verification

The active deployment is Vercel (`https://legal-bridge-pi.vercel.app`) backed
by Render (`https://legalbridge-4.onrender.com`). Direct authentication,
current-user, case-list, and dashboard requests were verified on 2026-08-01
for the `legalbridge-casework` workspace.

`LB-CASE-2026-012` has 10 persisted, processed source documents and a
persisted analysis run. Its source-linked analysis is synthetic demonstration
material requiring attorney verification. The seeded authority corpus is also
synthetic and must not be presented as verified legal authority.

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

Dockerfiles and deployment configuration are present, and the current Vercel /
Render deployment uses Supabase PostgreSQL. Render local binaries remain
ephemeral, so production document storage must use the private Supabase storage
provider. The platform still requires official verified-authority ingestion,
monitoring, backups, secret rotation, and a full security/legal review before
any non-demonstration use.

Synthetic demonstration data. Not legal advice. Attorney verification
required. No automatic court filing.
