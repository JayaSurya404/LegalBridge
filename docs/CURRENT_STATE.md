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
- The FastAPI service is a foundation only. There is no production authentication, database, Supabase, cloud storage, OCR, document processing, AI/model integration, RAG, real legal research, verified legal corpus, backend multi-agent execution, citation verification, streaming, server-side PDF generation, or automatic filing.

## Verification

- Frontend preflight: `pnpm typecheck` passed (`tsc --noEmit`) on the first run.
- Backend lint: `server/.venv/Scripts/python.exe -m ruff check --no-cache app tests` passed with `All checks passed!` after correcting the initial findings.
- Focused backend tests: `server/.venv/Scripts/python.exe -m pytest tests` passed with 11 tests in 0.65 seconds.
- The test run emitted one dependency deprecation warning from FastAPI's compatibility `TestClient`; the pinned dependency set was retained.
- Pytest's cache provider is disabled in backend test configuration because cache-directory creation blocked during session teardown in the managed workspace.
- By user request, this Phase 2 work did not run frontend lint, build, check, development server, browser automation, or localhost testing.
- No frontend or backend development server was started.

## Package and installation status

- `package.json`, `client/package.json`, and `pnpm-lock.yaml` were not changed.
- No frontend dependency was added or upgraded, and `pnpm install` was not run.
- Created `server/.venv` with Python 3.12.10 and installed only the exact backend pins from `server/requirements-dev.txt`.
- Runtime pins: FastAPI 0.140.13, Uvicorn 0.52.0, and pydantic-settings 2.14.2.
- Development pins: HTTPX 0.28.1, pytest 9.1.1, and Ruff 0.16.0.
- No package was installed globally, and no local `.env` containing credentials was created.

## Git and phase boundary

- The handoff working tree contains unstaged Phase 2 backend and documentation changes; no frontend file is modified in the current Git status.
- No files were staged.
- No commit or push was performed.
- No branch, remote, or Git history change was performed.
- The authorised Phase 2 FastAPI foundation is complete and was not started as a live server.
- Phase 3 was not started.
