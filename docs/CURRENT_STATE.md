# Current state

Updated: 29 July 2026

## Repository state found

- Existing pnpm workspace on branch `main`, tracking the unchanged `origin` remote.
- Phase 2 work did not modify existing frontend files or frontend package manifests.
- `node_modules` was already present; dependency installation was not needed.
- The Next.js client, synthetic fixtures, local Zustand state, typed API abstraction, and all required route files were already present.

## Frontend already present

- Next.js 16.2.12 App Router client with React 19.2, strict TypeScript, Tailwind CSS, shadcn-style primitives, local assets, metadata, and print rules.
- Public landing and sign-in pages, local demonstration credentials, persisted authentication state, hydration-safe protected shell, sign-out, desktop sidebar, mobile drawer, breadcrumbs, toast system, and loading/error/not-found/configuration states.
- Dashboard, case search and filtering, six-step browser-local case creation, case overview, document metadata selection, deterministic 15-agent workflow, analysis pages, strategy, ethics, Motion Studio, Citation Firewall, attorney review, browser print gate, audit history, observability, display preferences, and safe demo reset.
- Deterministic synthetic case data, closed fictional authorities, typed frontend contracts, mock client, unavailable HTTP adapter, query keys, and TanStack Query provider.

## Continuation work completed

- Centralised motion, citation, ethics, approval-version, mock-hash, and export eligibility in one frontend gate.
- Added blocking checks for missing or incomplete citation support, unresolved ethics revisions, included blocked strategies, and ethics-rejected arguments manually reinserted into the saved motion.
- Bound export to a valid saved motion body, deterministic mock hash, current approval version, and all current Citation Firewall and ethics conditions.
- Invalidated attorney approval when an ethics decision changes and prevented duplicate workflow, document-processing, ethics-review, and approval transitions.
- Made the Citation Firewall metrics derive from actual case state while retaining the required seed result: 9 citations, 9 resolved source records, 9 verified quotations, 9 supported propositions, 0 phantom citations, 0 unsupported final claims, and 1 required ethics rejection.
- Added visible, cancellable simulated document-processing progress, extension/MIME/size/empty/duplicate/safe-name/capacity validation, and store-level duplicate/capacity protection.
- Added workflow-created audit events for facts, timeline events, contradictions, and potential procedural concerns when the closed seed fixtures exist.
- Locked workflow start until document metadata exists and simulated processing is complete.
- Clarified the browser-created-case boundary: custom files are not parsed, orchestration can be demonstrated, and no case-specific legal outputs are fabricated.
- Repaired custom-case empty states and removed inaccurate fixed fact/citation percentages from case and observability summaries.
- Added print-view draft watermarking, more complete approval preconditions, invalid/stale approval states, and dynamic locked-export explanations.
- Connected case-wizard and attorney-review errors to their inputs for assistive technology.
- Corrected the mock sign-in response so an email is returned only for valid credentials and made the unavailable HTTP adapter reject predictably.

## Phase 2 backend foundation completed

- Added a Python 3.10+ FastAPI application factory and exported application instance under `server/app`.
- Added the versioned `/api/v1` router, root service metadata, health, readiness, and capability endpoints.
- Added localhost CORS, request IDs, process-time headers, standard request logging, safe structured errors, Pydantic Settings, and optional local `.env` loading.
- Readiness reports the API as ready while database, storage, and AI remain `not_configured`.
- Capabilities report document processing and legal research as unavailable, multi-agent execution and citation verification as frontend simulations only, and automatic court filing as prohibited.
- Added exact runtime and development dependency pins, a repository-local `server/.venv`, focused endpoint tests, Ruff configuration, an environment example, and PowerShell start/test helpers.
- The frontend remains in deterministic `mock` mode; its unavailable HTTP adapter was not activated or changed.

## Phase 3 persistence and authentication completed

- Added async SQLAlchemy 2.0 configuration and sessions with local SQLite and PostgreSQL-compatible models.
- Added Alembic configuration and the initial migration for organisations, users, refresh sessions, cases, document metadata, and audit events. Normal application startup does not create tables.
- Added organisation-scoped `admin`, `attorney`, and `reviewer` identities; Argon2 password hashing; HS256 access tokens; rotating, revocable refresh sessions; token-version invalidation; role dependencies; and generic login failures.
- Added administrator-only user provisioning and activation controls, including self-deactivation protection and audit events.
- Added organisation-isolated case list, create, read, update, and archive APIs. Cross-organisation access returns 404, and assigned attorneys must be active attorneys in the same organisation.
- Added JSON-only PDF, TXT, and DOCX metadata APIs with filename, declared-size, SHA-256, duplicate, and 50 MB validation. No binary content is accepted or stored.
- Added case audit history ordered newest first and audit writes for sign-in, password changes, user management, case mutations, document metadata mutations, and demo bootstrap.
- Updated readiness to query the configured database and capabilities to report the Phase 3 boundary accurately.
- Applied the initial migration to the ignored local `server/legalbridge.db` and ran the idempotent synthetic demo bootstrap.
- Added `scripts/init_backend_data.ps1` for migration and bootstrap initialization.
- The frontend remains unchanged in deterministic `mock` mode; real frontend/backend integration has not started.

## Routes and surfaces inspected

Public routes:

- `/`
- `/sign-in`

Protected routes:

- `/dashboard`
- `/cases`
- `/cases/new`
- `/cases/[caseId]`
- `/cases/[caseId]/documents`
- `/cases/[caseId]/workflow`
- `/cases/[caseId]/timeline`
- `/cases/[caseId]/contradictions`
- `/cases/[caseId]/procedural-audit`
- `/cases/[caseId]/research`
- `/cases/[caseId]/strategy`
- `/cases/[caseId]/ethics`
- `/cases/[caseId]/motion`
- `/cases/[caseId]/review`
- `/cases/[caseId]/audit-log`
- `/observability`
- `/settings`

Also inspected the root loading, error, and not-found boundaries; authentication guard; responsive workspace navigation; case navigation; dialogs; shared status and disclaimer components; persisted app store; domain contracts; synthetic seed; API adapters; public environment handling; and responsive/print styles.

## Known limitations

- Authentication, document processing, workflow activity, legal analysis, citations, authorities, token counts, costs, time-reduction figures, and audit records are deterministic frontend demonstrations.
- Browser-created files are reduced to safe metadata. No binary is persisted, uploaded, parsed, or used to generate case-specific findings.
- Only the preloaded synthetic matter contains the closed timeline, contradiction, procedural, research, strategy, ethics, citation, and motion fixtures.
- Browser-local state is neither secure nor authoritative.
- Browser print/Save as PDF is the only export mechanism and never files anything with a court.
- The FastAPI service now persists Phase 3 organisations, users, authentication sessions, cases, document metadata, and audit events locally.
- There is no binary or cloud storage, Supabase connection, OCR, document parsing, transcription, AI/model integration, RAG, embeddings, pgvector, real legal research, verified legal corpus, backend multi-agent execution, citation verification, motion generation, streaming, server-side PDF generation, digital signature, or automatic filing.

## Verification

- Frontend preflight: `pnpm typecheck` passed (`tsc --noEmit`) on the first run.
- Backend lint: `server/.venv/Scripts/python.exe -m ruff check --no-cache app tests` passed with `All checks passed!` after correcting the initial findings.
- Focused backend tests: `server/.venv/Scripts/python.exe -m pytest tests` passed with 11 tests in 0.65 seconds.
- The test run emitted one dependency deprecation warning from FastAPI's compatibility `TestClient`; the pinned dependency set was retained.
- Pytest's cache provider is disabled in backend test configuration because cache-directory creation blocked during session teardown in the managed workspace.
- By user request, this Phase 2 work did not run frontend lint, build, check, development server, browser automation, or localhost testing.
- No frontend or backend development server was started.
- Phase 3 dependency installation completed inside `server/.venv`.
- Alembic upgrade `0001_phase3` completed against the local SQLite database.
- The demo bootstrap completed and created the synthetic organisation, admin, attorney, case, and bootstrap audit event without exposing secrets in logs.
- Ruff safe fixes completed with 6 fixes, Ruff formatting completed with 6 files reformatted, and the final Ruff check passed with `All checks passed!`.
- Focused Phase 3 pytest completed with 17 passing tests in 4.30 seconds.
- The test run retained one dependency deprecation warning from FastAPI's compatibility `TestClient`; the requested pinned HTTPX version was preserved.
- Pytest required managed filesystem permission for isolated temporary SQLite databases; no test used the development database.

## Package and installation status

- `package.json`, `client/package.json`, and `pnpm-lock.yaml` were not changed.
- No frontend dependency was added or upgraded, and `pnpm install` was not run.
- Created `server/.venv` with Python 3.12.10 and installed only the exact backend pins from `server/requirements-dev.txt`.
- Runtime pins: FastAPI 0.140.13, Uvicorn 0.52.0, and pydantic-settings 2.14.2.
- Development pins: HTTPX 0.28.1, pytest 9.1.1, and Ruff 0.16.0.
- Phase 3 runtime pins added: aiosqlite 0.21.0, Alembic 1.17.1, asyncpg 0.30.0, email-validator 2.3.0, pwdlib 0.3.0 with Argon2, PyJWT 2.10.1, and SQLAlchemy 2.0.44 with asyncio support.
- No package was installed globally, and no local `.env` containing credentials was created.

## Git and phase boundary

- The handoff working tree contains unstaged Phase 3 backend and documentation changes; no frontend file was modified by Phase 3.
- No files were staged.
- No commit or push was performed.
- No branch, remote, or Git history change was performed.
- The authorised Phase 3 persistence and authentication backend is complete and was not started as a live server.
- Phase 4 was not started.
