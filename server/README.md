# LegalBridge India Phase 3–6 API

This directory contains the authenticated persistence and document-ingestion backend for the LegalBridge India attorney-assistance hackathon prototype.

## Implemented

- Async SQLAlchemy 2.0 with SQLite development persistence and PostgreSQL-compatible models.
- Alembic-managed schema; normal application startup never calls `create_all`.
- Organisation-scoped users, `admin`/`attorney`/`reviewer` roles, Argon2 passwords, JWT access tokens, rotating refresh sessions, and logout revocation.
- Organisation-isolated cases, private document binaries, extraction metadata, source pages, and audit events.
- Streamed multipart PDF, DOCX, and TXT upload with a configured 50 MB default limit.
- Server-authoritative SHA-256, duplicate-content rejection within a case, safe filename checks, MIME/extension agreement, and content-signature validation.
- PDF physical-page extraction with PyMuPDF.
- DOCX ordered paragraph, heading, and table extraction with clearly labelled logical sections.
- Controlled TXT decoding with form-feed or deterministic logical pages.
- Optional Tesseract OCR for PDF pages without meaningful embedded text.
- Authenticated original download, reprocessing, and deletion.
- Idempotent generation, private storage, extraction, and persistence of three synthetic demonstration sources.

## Private storage

The default ignored development root is `server/data/uploads`:

```text
server/data/uploads/
  {organization_id}/
    {case_id}/
      {document_id}/
        original.{extension}
```

Original filenames are metadata only and never become path components. The API uses opaque server IDs, stages uploads in chunks, validates before an atomic move, and never exposes `storage_key` or a local path to clients. Authenticated routes enforce organisation and case isolation.

Generated user uploads, extracted local user text, the SQLite database, the virtual environment, and secrets are not committed.

## Validation and extraction

Supported types:

| Type | Declared MIME type | Signature/structure validation | Source-page model |
| --- | --- | --- | --- |
| PDF | `application/pdf` | `%PDF-` signature | Physical PDF pages |
| DOCX | Office Open XML DOCX MIME | Valid ZIP, required Office entries, bounded entries/expansion/ratio | Logical DOCX sections |
| TXT | `text/plain` | Controlled binary/NUL checks and decoding | Form-feed pages or logical text chunks |

The server computes SHA-256 while streaming. Browser hashes are preliminary only. Duplicate server hashes within the same case return HTTP 409. Empty or invalid files return controlled HTTP 400 errors, oversized uploads return 413, permission failures return 403, and missing/cross-organisation records return 404.

Extraction stores safe text and page metadata only; it performs no legal reasoning. Configured per-page, total-text, and page-count limits prevent unbounded extraction. Parser errors are converted to safe status messages without persisting stack traces.

### Optional OCR

OCR is disabled by default. The Python package does not install Tesseract itself.

- When `LEGALBRIDGE_OCR_ENABLED=true` and a working Tesseract executable is detected, only PDF pages without meaningful embedded text are rendered and OCRed.
- `LEGALBRIDGE_TESSERACT_COMMAND` may select an existing executable.
- When Tesseract is absent or OCR is disabled, ordinary text PDFs still process normally.
- Image-only pages retain empty text with `ocr_required`; mixed PDFs become `partially_processed`. No text is invented.

## Setup and initialization

From the repository root:

```powershell
python -m venv server/.venv
server\.venv\Scripts\python.exe -m pip install -r server\requirements-dev.txt
powershell -ExecutionPolicy Bypass -File .\scripts\init_backend_data.ps1
```

The initialization script stops on failure and runs, in order:

1. `alembic upgrade head`
2. The idempotent organisation/user/case bootstrap
3. The idempotent three-document generation, storage, and extraction bootstrap

Generated demo originals are valid synthetic PDF, DOCX, and TXT files under ignored private storage. Every file identifies itself as fictional hackathon data and not an official record.

## Start and test

Start only FastAPI:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_backend.ps1
```

Start the full stack:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_fullstack.ps1
```

Run backend checks:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\test_backend.ps1
```

Run the live ingestion smoke test on a temporary port:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\smoke_phase5_6.ps1 -Port 8766
```

## Development accounts

Organisation slug: `legalbridge-demo`

- Admin: `admin@legalbridge.demo` / `LegalBridgeAdmin@2026`
- Attorney: `attorney@legalbridge.demo` / `LegalBridge@2026`

## Document API

- `GET /api/v1/cases/{case_id}/documents`
- `POST /api/v1/cases/{case_id}/documents` — compatible metadata-only registration
- `POST /api/v1/cases/{case_id}/documents/upload`
- `GET /api/v1/cases/{case_id}/documents/{document_id}`
- `GET /api/v1/cases/{case_id}/documents/{document_id}/download`
- `POST /api/v1/cases/{case_id}/documents/{document_id}/reprocess`
- `DELETE /api/v1/cases/{case_id}/documents/{document_id}`
- `GET /api/v1/cases/{case_id}/audit-events`

Reviewers may list, inspect, and download. Only attorneys and administrators may upload, reprocess, or delete.

## Configuration

Copy `server/.env.example` to ignored `server/.env` for local overrides. Document-ingestion settings include:

- `LEGALBRIDGE_STORAGE_ROOT`
- `LEGALBRIDGE_MAX_UPLOAD_BYTES`
- `LEGALBRIDGE_OCR_ENABLED`
- `LEGALBRIDGE_TESSERACT_COMMAND`
- `LEGALBRIDGE_EXTRACTION_TEXT_LIMIT`
- `LEGALBRIDGE_EXTRACTION_PAGE_TEXT_LIMIT`
- `LEGALBRIDGE_EXTRACTION_MAX_PAGES`

The checked-in JWT value is development-only. Production mode rejects it.

## Not implemented

There is no statutory or precedent corpus ingestion, retrieval, embeddings, pgvector, RAG, AI provider, LangGraph execution, real multi-agent reasoning, legal Copilot, citation verification, motion generation from uploaded sources, digital signature, or court filing.
