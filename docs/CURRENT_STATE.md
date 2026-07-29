# LegalBridge India current state

Updated: 2026-07-29

Repository: `D:\LegalBridge`

Branch: `main`

Checkpoint: Phase 4 complete — real Next.js to FastAPI integration

## Product boundary

LegalBridge India remains an attorney-assistance hackathon prototype for problem statement `SDGGAIP016`, aligned with SDG 16.3 and SDG 10.3.

- “Autonomous until review, never autonomous at filing.”
- “No source, no legal claim. No lawyer approval, no export.”

Authentication and persistence are now real. Legal analysis is not: the facts, timeline, contradictions, potential procedural concerns, authorities, strategies, citations, motion, workflow execution, token/cost metrics, and related analysis audit entries remain closed deterministic synthetic fixtures requiring attorney verification.

## Preserved Phase 1–3 state

- The responsive Next.js App Router workspace, accessibility behavior, deterministic 15-agent frontend simulation, legal-analysis views, Ethics Auditor, Motion Studio, Citation Firewall, version-bound attorney approval, approval invalidation, print gate, observability, and display settings remain available.
- The Phase 3 backend remains intact: organisation isolation, users and roles, Argon2 password hashing, access tokens, rotating and revocable refresh sessions, cases, document metadata, audit events, SQLAlchemy models, SQLite development persistence, PostgreSQL-compatible modeling, Alembic migrations, controlled errors, request IDs, CORS, readiness, and capability reporting.
- No Phase 4 backend route, schema, model, migration, seed, or test was changed.
- The real local SQLite database was preserved.

## Phase 4 frontend integration

### Environment and client selection

- `NEXT_PUBLIC_DATA_MODE` accepts `mock` or `http`.
- HTTP mode requires a valid `NEXT_PUBLIC_API_BASE_URL`.
- The ignored `client/.env.local` selects `http://127.0.0.1:8000` for local development.
- Public environment variables contain no secrets.
- HTTP errors remain visible and never trigger a silent mock fallback.

### Authentication and session behavior

- The sign-in form collects organisation workspace slug, email, and password using React Hook Form and Zod.
- It provides accessible validation, show/hide password, loading state, real backend errors, request IDs when present, and attorney credential autofill.
- Login, refresh, logout, and current-user verification use the Phase 3 FastAPI endpoints.
- The hackathon session stores the user, access token, rotating refresh token, and access-token expiry in `sessionStorage`.
- Tokens and the current user are excluded from persisted Zustand state and `localStorage`.
- Browser refresh restores the session and verifies it through `/api/v1/auth/me`.
- Authenticated requests pre-emptively refresh expired access tokens and retry once after a 401.
- A module-level shared refresh promise allows only one token rotation at a time.
- Refresh failure clears session storage and protected workspace state.
- Logout attempts backend revocation and always clears the local session, including during backend unavailability.
- Protected routes wait for Zustand hydration and session restoration, redirect safely to sign-in, and retain a valid internal requested route.

`sessionStorage` is suitable only for this hackathon checkpoint. Production should use stronger secure, HttpOnly, same-site cookie controls and appropriate CSRF protections.

### Persistent cases

- Case lists load from FastAPI after authentication and can be refreshed.
- Search, status filters, review filters, backend error messaging, and database-ID navigation are retained.
- The accessible six-step case wizard persists title, unique case number, allegation summary, allegation type, court/forum, and jurisdiction.
- The signed-in attorney is assigned when the authenticated role is `attorney`.
- Duplicate case-number conflicts and structured validation errors are shown without collecting real confidential data.
- New backend cases receive empty analysis, workflow outputs explaining the boundary, and no copied demo timeline, contradictions, findings, authorities, strategies, citations, or motion.

Backend case `LB-DEMO-2026-001` is matched by case number. Its database ID is authoritative for routes and API calls; backend metadata is authoritative for identity. Only this case receives the existing closed synthetic analysis fixture. Safe browser-local workflow progress, motion edits, and approval state are preserved across backend refreshes.

### Document metadata

- The document page lists, creates, and deletes real backend document metadata.
- It accepts PDF, TXT, and DOCX selections, validates filename safety, exact extension/MIME agreement, non-empty size, the 50 MB limit, duplicates, and the 12-record case limit.
- Browser Web Crypto computes SHA-256 locally.
- Only `original_filename`, `content_type`, `size_bytes`, `sha256`, and `category` are sent to FastAPI.
- Deterministic progress covers hashing and registration.
- Duplicate SHA-256 conflicts and backend request IDs are surfaced.
- Selected `File` objects are discarded after the registration batch.
- Backend audit events are resynchronised after metadata creation and deletion.
- Closed synthetic source fixtures are visibly separated from backend metadata and cannot be deleted through the metadata API.

No file bytes are uploaded or persisted. No parsing, OCR, transcription, malware scanning, or AI analysis occurs.

### Audit synchronisation

- Case audit events load from FastAPI and map into the existing audit interface.
- Events show actor, event type, related entity, timestamp, metadata, and source.
- Backend authentication, case, and document-metadata events are authoritative.
- Closed synthetic workflow and analysis events remain available only for the demonstration case.
- Merging deduplicates by event ID and the UI sorts newest first.
- Mount effects do not manufacture duplicate events during React rerenders.

### Workspace shell

- The shell waits for both persisted-store hydration and verified backend-session restoration.
- It shows the authenticated user’s name and role.
- It includes persistent workspace refresh and real backend logout.
- Desktop sidebar, mobile drawer, keyboard behavior, focus states, loading states, and explicit backend-error feedback remain.
- Product copy distinguishes real persistence from synthetic legal analysis.

## Local scripts

`scripts/start_fullstack.ps1`:

- Resolves the repository root.
- Verifies pnpm and `server/.venv`.
- Starts FastAPI on port 8000 and Next.js on port 3000 in separate PowerShell windows only when each port is free.
- Does not start duplicate processes for occupied ports.
- Prints the frontend URL, Swagger URL, workspace slug, and development credentials.

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_fullstack.ps1
```

`scripts/smoke_phase4.ps1`:

- Accepts a requested port from 8765 through 8799 and selects another free port in that range when necessary.
- Starts a hidden temporary FastAPI process.
- Verifies health, real login, `/auth/me`, the persistent demonstration case, and refresh-token rotation.
- Stops that exact temporary process in `finally`.
- Does not depend on ports 3000 or 8000.

## Verified results

Verification completed on 2026-07-29:

- Backend Ruff: `server/.venv/Scripts/python.exe -m ruff check --no-cache app tests` — passed, “All checks passed.” The initial cache-enabled invocation was blocked before linting by managed `.ruff_cache` permissions.
- Phase 3 pytest: `server/.venv/Scripts/python.exe -m pytest tests --basetemp C:\tmp\legalbridge-phase4-pytest-019fad6f` — 17 passed, 1 third-party Starlette deprecation warning, in 3.93 seconds. Managed temp permissions blocked the initial setup attempts before any test ran; the final isolated run was authorised outside the sandbox.
- Frontend type-check: `pnpm typecheck` — passed after correcting the syntax failure found by its first run.
- Frontend lint: `pnpm lint` — passed with zero warnings after correcting the React effect-pattern failure found by its first run.
- Frontend production build: `pnpm build` — passed with Next.js 16.2.12 using the HTTP `.env.local`.
- Phase 4 smoke: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\smoke_phase4.ps1 -Port 8765` — passed on `http://127.0.0.1:8765`; health, login, `/auth/me`, persistent cases, and refresh rotation verified.
- No browser automation was run.
- No frontend or backend development server was left running by verification.

## Explicitly not implemented

- Binary file upload or object/cloud storage
- PDF or DOCX parsing
- OCR or audio transcription
- AI/model providers or Gemini calls
- LangGraph or backend multi-agent execution
- RAG, embeddings, PostgreSQL activation, or pgvector
- Real legal research, statutes, precedents, or a verified legal corpus
- Real citation verification
- Backend motion generation or server-side PDF generation
- Digital signatures
- Automatic court filing
- Docker or cloud deployment

## Repository state

- `.git`, branch `main`, history, and remote `origin` were preserved.
- The working tree contains unstaged Phase 4 frontend, script, environment-example, ignore, and documentation changes.
- `client/.env.local`, the real SQLite database, virtual environment, caches, bytecode, backups, and `server/*.egg-info/` are ignored.
- No `server/*.egg-info` directory is present.
- No commit, stage, push, pull, merge, rebase, branch change, or remote change occurred.
- Phase 5 was not started.
