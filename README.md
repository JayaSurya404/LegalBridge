# LegalBridge India

Problem statement: `SDGGAIP016`

LegalBridge India is an attorney-assistance hackathon prototype aligned with SDG 16.3 and SDG 10.3. The Phase 4 checkpoint connects the Next.js workspace to a real FastAPI persistence and authentication API while keeping every legal-analysis output explicitly synthetic.

> **Legal disclaimer:** This is not an official government service, a source of final legal advice, a replacement for professional legal judgment, or an automatic court-filing system. Every output requires attorney verification. The demonstration legal analysis and authorities are synthetic and have not been checked against a legal corpus.

The operating principles are:

- “Autonomous until review, never autonomous at filing.”
- “No source, no legal claim. No lawyer approval, no export.”

## Implemented checkpoint

Phase 4 provides:

- Real organisation-scoped sign-in, current-user verification, refresh-token rotation, and logout revocation.
- SQLite-backed case, document-metadata, and audit-event persistence through FastAPI.
- Backend database IDs as the frontend routing identity.
- Browser SHA-256 calculation for selected PDF, TXT, and DOCX files.
- Metadata-only document registration and deletion; selected file bytes are discarded.
- A closed synthetic legal-analysis fixture attached only to backend case `LB-DEMO-2026-001`.
- A deterministic frontend workflow, motion versioning, attorney approval, approval invalidation, and export safety gate.

It does **not** provide binary upload, object storage, PDF or DOCX parsing, OCR, transcription, backend agent execution, AI providers, LangGraph, RAG, embeddings, pgvector, real legal research, verified statutes or precedents, citation verification, server-side motion generation, digital signatures, or court filing.

## Requirements

- Node.js 20.9 or newer.
- pnpm 10 or newer.
- Python 3.10 or newer.
- The existing backend virtual environment at `server/.venv`.
- A modern browser with `sessionStorage`, `localStorage`, and Web Crypto support.

## Configuration

Copy `client/.env.example` to the ignored `client/.env.local`. Phase 4 local development uses:

```dotenv
NEXT_PUBLIC_DATA_MODE=http
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

For the isolated deterministic frontend provider, use:

```dotenv
NEXT_PUBLIC_DATA_MODE=mock
```

Do not put passwords, tokens, API keys, or other secrets in `NEXT_PUBLIC_*`.

The HTTP-mode hackathon session stores the verified user, access token, rotating refresh token, and access-token expiry in browser `sessionStorage`; tokens are never persisted in Zustand or `localStorage`. A production implementation should use stronger secure, HttpOnly, same-site cookie controls and appropriate CSRF protections.

## Install and run

Install the frontend workspace dependencies:

```powershell
pnpm install
```

Start both applications in separate PowerShell windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_fullstack.ps1
```

The script checks ports before starting processes:

- Frontend: `http://localhost:3000`
- Backend Swagger: `http://127.0.0.1:8000/docs`

Root pnpm commands intentionally operate on the client only:

```powershell
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
pnpm check
```

## Development credentials

Organisation workspace: `legalbridge-demo`

| Role | Email | Password |
| --- | --- | --- |
| Attorney | `attorney@legalbridge.demo` | `LegalBridge@2026` |
| Admin | `admin@legalbridge.demo` | `LegalBridgeAdmin@2026` |

Attorney review PIN for the closed frontend demonstration: `2026`.

## Phase 4 smoke test

The focused smoke test starts a temporary FastAPI process on a free port from 8765 through 8799, checks health, real login, `/auth/me`, persistent case listing, and refresh-token rotation, then stops that exact process in `finally`.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke_phase4.ps1 -Port 8765
```

## Demonstration walkthrough

1. Open `/`, enter the demo workspace, and use the attorney credential autofill.
2. Sign in through FastAPI and confirm the shell shows the authenticated name and role.
3. Refresh persistent cases and open backend case `LB-DEMO-2026-001`.
4. Review its separately labelled closed synthetic source and analysis fixtures.
5. Select a safe PDF, TXT, or DOCX file; confirm only metadata and a browser-computed SHA-256 are registered.
6. Refresh or delete document metadata and inspect the synchronised backend audit events.
7. Create a new backend case and confirm it has empty analysis state rather than copied demo findings.
8. Run the fixed frontend workflow on the demonstration case and inspect Timeline, Contradictions, Procedural Audit, Research, Strategy, and Ethics.
9. Open Motion Studio and confirm the Citation Firewall blocks unsupported output.
10. Approve the exact saved synthetic motion version with PIN `2026`; edit it and verify approval is revoked and export locks.
11. Sign out and confirm the backend refresh session is revoked while local clearing still completes.

## Data and safety boundaries

- Backend authentication, cases, document metadata, and their audit events are authoritative.
- The demonstration legal facts, analysis, authorities, workflow outputs, motion, and related audit fixtures are deterministic synthetic frontend data.
- Newly created backend cases receive no timeline, contradictions, procedural findings, authorities, strategy, citations, or motion.
- Raw selected file bytes are never sent to FastAPI and are discarded after local hashing.
- No real confidential or personal case information should be entered during hackathon development.
- No automatic filing path exists. Export remains tied to attorney approval of the exact saved motion version.

See [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) for the verified implementation and test status.
