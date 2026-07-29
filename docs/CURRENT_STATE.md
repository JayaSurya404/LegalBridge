# LegalBridge India current state

Updated: 2026-07-29

Repository: `D:\LegalBridge`

Branch: `main`

Checkpoint: combined Phase 5–6 complete — real private binary storage and source extraction

## Product boundary

LegalBridge India remains an attorney-assistance hackathon prototype for problem statement `SDGGAIP016`, aligned with SDG 16.3 and SDG 10.3.

- “Autonomous until review, never autonomous at filing.”
- “No source, no legal claim. No lawyer approval, no export.”

Binary storage, source extraction, and extracted-page persistence are real. Legal analysis is not generated from uploaded documents. The facts, timeline, contradictions, potential procedural concerns, authorities, strategies, citations, motion, workflow execution, token/cost metrics, and related analysis audit entries shown for the designated demonstration case remain closed deterministic synthetic fixtures requiring attorney verification.

## Preserved Phase 1–4 state

- The responsive Next.js App Router workspace, accessibility behavior, deterministic synthetic legal-analysis views, Ethics Auditor, Motion Studio, Citation Firewall, version-bound attorney approval, approval invalidation, print gate, observability, and display settings remain available.
- Organisation isolation, users and RBAC, Argon2 password hashing, access tokens, rotating and revocable refresh sessions, cases, audit events, async SQLAlchemy persistence, SQLite development storage, PostgreSQL-compatible modeling, Alembic migrations, controlled errors, request IDs, CORS, readiness, and capability reporting remain intact.
- Real FastAPI sign-in, browser session restoration, refresh-token rotation, persistent case listing/creation, audit synchronization, and the HTTP/mock data-provider boundary remain intact.
- The existing database was migrated in place. Existing metadata-only document records remain valid with `metadata_only` extraction status.
- The existing demonstration case is preserved and matched by case number `LB-DEMO-2026-001`.

## Combined Phase 5–6 backend

### Private storage and validation

- Multipart uploads stream in bounded chunks to a temporary staging file beneath the configured storage root.
- The default ignored storage root is `server/data/uploads`.
- Final keys use opaque server identifiers: `{organization_id}/{case_id}/{document_id}/original.{extension}`.
- Original filenames are metadata only and never become path components or API-exposed storage locations.
- A validated staging file is atomically moved to its final location.
- Failure cleanup removes staging files; database failure cleanup removes the stored binary.
- Download, reprocessing, and deletion resolve paths through the same root-contained storage service.
- The server enforces filename safety, supported extension, declared MIME type, non-empty input, and a configurable 50 MB default while streaming.
- PDF requires `%PDF-`; DOCX requires a safe ZIP container with `[Content_Types].xml` and `word/document.xml`; TXT uses controlled binary checks and decoding.
- DOCX ZIP entry count, expanded size, and compression-ratio limits reduce archive-bomb risk.
- SHA-256 is computed by the server while streaming and is authoritative.
- Duplicate content within one case returns HTTP 409.

### Extraction and persistence

- Migration `0002_phase5_6_document_ingestion` adds storage, parser, status, count, error, and timestamp fields without destroying existing document records.
- `document_pages` persists organisation, case, document, 1-based page number, label, normalized extracted text, character count, extraction method, and timestamps.
- Document/page foreign keys cascade on deletion, and document/page-number uniqueness is enforced.
- PyMuPDF extracts one persisted record for every physical PDF page.
- PDF pages without meaningful embedded text are OCRed only when OCR is enabled and Tesseract is available. Otherwise they retain empty text and report `ocr_required`; mixed documents report `partially_processed`.
- python-docx extracts headings, paragraphs, and tables in stable document order into explicitly labelled logical sections. These are not represented as physical pages.
- TXT decoding prefers BOM-aware UTF-8, UTF-8, confidently detected UTF-16, and a controlled charset-normalizer fallback. Form feeds define logical pages when present; otherwise deterministic text chunks are used.
- Page-count and per-page/total character limits bound extraction. Parser failures become safe status messages without browser-visible or database-persisted stack traces.
- Extraction performs no legal reasoning and never fabricates source text.

### API and permissions

- `GET /api/v1/cases/{case_id}/documents`
- `POST /api/v1/cases/{case_id}/documents` for compatible metadata-only registration
- `POST /api/v1/cases/{case_id}/documents/upload`
- `GET /api/v1/cases/{case_id}/documents/{document_id}`
- `GET /api/v1/cases/{case_id}/documents/{document_id}/download`
- `POST /api/v1/cases/{case_id}/documents/{document_id}/reprocess`
- `DELETE /api/v1/cases/{case_id}/documents/{document_id}`

All document operations enforce organisation and case isolation. Reviewers may list, inspect, and download. Attorneys and administrators may additionally upload, reprocess, and delete.

Audit events cover upload start, validation failure, storage completion, extraction start, processed/partial/OCR-required/failed outcomes, download, reprocessing, deletion, and demonstration bootstrap. Audit metadata does not include tokens, passwords, storage paths, or extracted text.

## Demonstration sources

The idempotent backend initializer now generates, stores, extracts, and persists three valid synthetic files for `LB-DEMO-2026-001`:

1. A three-page synthetic PDF court transcript
2. A structured synthetic DOCX police report with headings and tables
3. A multi-section synthetic TXT arrest memo

Every document identifies itself as fictional hackathon data, not an official record. The bootstrap uses the production storage and extraction services, computes real SHA-256 values, and does not duplicate records when rerun.

Exact command:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\init_backend_data.ps1
```

The command applies Alembic migrations, runs the existing base bootstrap, then runs the document bootstrap. It stops on failure.

## Frontend integration

- The existing Phase 4 API client, session refresh flow, contracts, mappers, and Zustand store now handle multipart upload, document detail, source pages, original-file blobs, and reprocessing.
- Browser SHA-256 is preliminary progress only; displayed persisted metadata comes from the server-authoritative digest.
- The Documents workspace validates selections, uploads actual bytes, shows deterministic progress, and surfaces structured 400/403/404/409/413/422 errors.
- Document summaries show extraction status, page count, character count, parser, binary availability, and actionable error/OCR messages.
- Attorneys and administrators receive download, reprocess, and delete controls; reviewer restrictions are explained.
- The source viewer expands persisted physical PDF pages or clearly labelled logical DOCX/TXT sections, supports text copying, and represents empty text truthfully.
- Refresh resynchronizes documents and audit events from FastAPI.
- Case and dashboard summaries use backend document records for document, processed, OCR-required, failed, and extracted-page counts.
- Newly uploaded documents do not receive synthetic analysis. The closed synthetic workflow remains isolated to the designated demonstration case.

## Optional OCR

- `LEGALBRIDGE_OCR_ENABLED` defaults to `false`.
- `LEGALBRIDGE_TESSERACT_COMMAND` may point to an already installed Tesseract executable.
- The Python wrapper is installed in `server/.venv`; Tesseract itself was not installed globally.
- Text PDF, DOCX, and TXT processing works without Tesseract.
- When OCR is unavailable, the system does not claim OCR occurred or invent text.

## Local commands

Initialize or refresh demo data:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\init_backend_data.ps1
```

Start the full stack:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_fullstack.ps1
```

Run the temporary-port ingestion smoke:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\smoke_phase5_6.ps1 -Port 8766
```

The smoke script starts a hidden FastAPI process on a free port from 8765–8799, signs in, creates a clearly synthetic case, uploads real TXT bytes, verifies persisted extraction text, downloads byte-equal content, verifies duplicate rejection, deletes the document, archives the case, deletes its temporary file, and stops the exact process in `finally`.

## Verified results

Verification completed on 2026-07-29:

- Dependency installation: the exact Phase 5–6 packages were installed only in `server/.venv`.
- Alembic: migration `0002_phase5_6_document_ingestion` applied successfully to the preserved local database.
- Demo bootstrap: passed and reported three demonstration document records; repeat execution is covered by the backend idempotency test.
- Ruff safe fixes: completed; two safe fixes were applied.
- Ruff formatter: completed; five Python files were formatted.
- Final Ruff: `server/.venv/Scripts/python.exe -m ruff check --no-cache app tests` — passed, `All checks passed!`
- Backend pytest: `server/.venv/Scripts/python.exe -m pytest tests --basetemp C:\tmp\legalbridge-phase5-6-pytest-019fad6f` — 24 passed with 6 third-party Starlette/PyMuPDF deprecation warnings in 10.02 seconds.
- Frontend type-check: `pnpm typecheck` — passed.
- Frontend lint: `pnpm lint` — passed with zero warnings.
- Frontend production build: `pnpm build` — passed with Next.js 16.2.12 using the HTTP `.env.local`.
- Live smoke: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\smoke_phase5_6.ps1 -Port 8766` — passed on `http://127.0.0.1:8766`; upload, extraction, persisted pages, byte-equal download, duplicate HTTP 409, deletion, archival, and cleanup were verified.
- No browser automation was run, as requested.
- The smoke process stopped successfully; ports 8000 and 8766 were inactive at final inspection. Port 3000 had an existing active listener and was not started or altered by the Phase 5–6 verification.
- `git diff --check` passed; its only output was the repository's existing Windows LF-to-CRLF conversion notices.

## Explicitly not implemented

- Statutory corpus or precedent corpus ingestion/retrieval
- Embeddings, pgvector, hybrid search, or RAG
- AI/model providers or Gemini calls
- LangGraph or real backend multi-agent reasoning
- Legal Copilot or legal analysis derived from uploaded sources
- Citation verification
- Motion generation from uploaded documents
- Attorney digital signatures
- Automatic court filing
- Docker or cloud deployment

These belong to later phases. Combined Phase 7–8 was not started.

## Repository state

- Repository `D:\LegalBridge`, `.git`, branch `main`, history, and remote `origin` (`https://github.com/JayaSurya404/LegalBridge.git`) were preserved.
- The working tree intentionally contains unstaged combined Phase 5–6 backend, frontend, migration, script, test, ignore, and documentation changes.
- `server/data/`, uploaded/generated binaries, extracted local user data, the SQLite database, `server/.env`, `server/.venv/`, `server/*.egg-info/`, Python/test caches, local backups, and `client/.env.local` are ignored.
- No `server/legalbridge.egg-info` directory or smoke temporary directory is present.
- No commit, stage, push, pull, merge, rebase, branch change, or remote change occurred.
