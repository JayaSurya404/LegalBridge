# LegalBridge India

Problem statement: `SDGGAIP016`

LegalBridge India is an attorney-assistance hackathon prototype aligned with SDG 16.3 and SDG 10.3. The combined Phase 5–6 checkpoint adds real private document storage and source extraction to the existing authenticated Next.js and FastAPI application while keeping legal analysis explicitly synthetic.

> **Legal disclaimer:** This is not an official government service, final legal advice, a replacement for professional judgment, or an automatic court-filing system. Extracted source text is not a legal finding. Every legal output requires independent attorney verification.

- “Autonomous until review, never autonomous at filing.”
- “No source, no legal claim. No lawyer approval, no export.”

## Current capabilities

- Real organisation-scoped authentication, rotating sessions, cases, document records, source pages, and audit persistence.
- Streamed multipart PDF, DOCX, and TXT uploads into ignored private backend storage.
- Server-side 50 MB enforcement, safe filename checks, extension/MIME agreement, content-signature validation, authoritative SHA-256, and duplicate rejection.
- PyMuPDF physical-page extraction for PDF.
- Ordered python-docx extraction into clearly labelled logical DOCX sections.
- Controlled TXT decoding into form-feed or deterministic logical text pages.
- Optional page-specific Tesseract OCR; normal text extraction does not depend on Tesseract.
- Authenticated source viewing, original download, reprocessing, and deletion.
- Three generated, privately stored, parsed, synthetic demonstration documents for backend case `LB-DEMO-2026-001`.
- The preserved deterministic synthetic legal-analysis walkthrough, Ethics Auditor, Citation Firewall, version-bound attorney approval, approval invalidation, and export gate.

Source extraction does **not** produce case facts, timelines, contradictions, legal findings, research, citations, strategies, motions, or filing actions.

## Requirements

- Node.js 20.9 or newer
- pnpm 10 or newer
- Python 3.10 or newer; the local environment uses Python 3.12
- Repository-local `server/.venv`
- A modern browser with `sessionStorage`, `localStorage`, and Web Crypto

Tesseract is optional and is not installed globally by this project.

## Configure

The ignored `client/.env.local` should contain:

```dotenv
NEXT_PUBLIC_DATA_MODE=http
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

The deterministic isolated frontend provider remains available with `NEXT_PUBLIC_DATA_MODE=mock`.

Copy `server/.env.example` to ignored `server/.env` only for local overrides. The default private storage root is `server/data/uploads`; it is ignored by Git and never exposed through API responses.

Do not place secrets in `NEXT_PUBLIC_*`.

## Install and initialize

```powershell
pnpm install
server\.venv\Scripts\python.exe -m pip install -r server\requirements-dev.txt
powershell -ExecutionPolicy Bypass -File .\scripts\init_backend_data.ps1
```

The initialization command applies migrations, creates the synthetic organisation/users/case, generates three valid synthetic files, stores them through the same private storage service used by uploads, extracts their source pages, and remains idempotent.

## Start the full stack

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_fullstack.ps1
```

- Frontend: `http://localhost:3000`
- Backend Swagger: `http://127.0.0.1:8000/docs`

The helper starts FastAPI and Next.js in separate PowerShell windows only when ports 8000 and 3000 are free.

## Development credentials

Organisation workspace: `legalbridge-demo`

| Role | Email | Password |
| --- | --- | --- |
| Attorney | `attorney@legalbridge.demo` | `LegalBridge@2026` |
| Admin | `admin@legalbridge.demo` | `LegalBridgeAdmin@2026` |

Attorney review PIN for the closed synthetic analysis walkthrough: `2026`.

## Jury demonstration

1. Run the initialization command, then start the full stack.
2. Sign in as the demonstration attorney.
3. Open case `LB-DEMO-2026-001` and choose **Documents**.
4. Show the three real stored sources: a multi-page PDF court transcript, structured DOCX police report, and multi-section TXT arrest memo.
5. Expand source pages and point out physical PDF labels versus logical DOCX/TXT labels.
6. Show server-authoritative SHA-256, parser, page count, character count, status, download, reprocess, copy-text, and delete controls.
7. Upload another synthetic TXT, PDF, or DOCX file and show validation, private storage, extraction, and audit events.
8. Explain that an image-only PDF becomes `ocr_required` when Tesseract is unavailable; no text is fabricated.
9. Create a new case and show that extracted pages do not create legal analysis.
10. Return to the designated demonstration case for the separately labelled closed synthetic workflow, ethics review, motion versioning, attorney approval, invalidation, and export gate.

## Validation and extraction boundary

- PDF files must start with `%PDF-`; each physical page receives a persisted source-page record.
- DOCX files must be safe ZIP containers with required Office entries and bounded expansion; their sections are logical, not physical pages.
- TXT files use controlled BOM/UTF-8/UTF-16/charset detection and reject clearly binary content.
- The server computes SHA-256 while streaming and rejects duplicate content within a case with HTTP 409.
- Uploaded originals remain downloadable even when extraction fails.
- OCR is optional. If disabled or unavailable, text PDFs still process and image-only pages truthfully require OCR.
- Audit metadata excludes passwords, tokens, local paths, and extracted document text.
- User uploads, extracted local user data, databases, secrets, and generated binaries remain ignored.

## Verification commands

```powershell
pnpm typecheck
pnpm lint
pnpm build
powershell -ExecutionPolicy Bypass -File .\scripts\smoke_phase5_6.ps1 -Port 8766
```

See [server/README.md](server/README.md) for backend details and [docs/CURRENT_STATE.md](docs/CURRENT_STATE.md) for exact verified results.

## Not implemented

Statutory corpus ingestion, precedent corpus ingestion, retrieval, embeddings, pgvector, RAG, AI providers, LangGraph, real multi-agent reasoning, Legal Copilot, citation verification, motion generation from uploaded documents, attorney digital signatures, and court filing remain outside this checkpoint. Automatic filing is prohibited.
