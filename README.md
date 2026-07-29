# LegalBridge India

Problem statement: `SDGGAIP016`

LegalBridge India is a frontend-only attorney-assistance hackathon prototype for organising synthetic case records into source-linked observations, a reconstructed timeline, contradiction review, potential procedural concerns, closed demonstration research, an ethics-screened strategy, and a draft motion. It deliberately stops at a named attorney approval gate.

> **Legal disclaimer:** This is not an official government service, a source of final legal advice, a replacement for professional legal judgment, or an automatic court-filing system. Every output requires attorney verification. The current demonstration uses only synthetic data and synthetic authorities that have not been checked against a legal corpus.

## SDG alignment and product principles

- SDG 16.3: promote the rule of law and equal access to justice.
- SDG 10.3: promote equal opportunity and reduce inequality.
- “Autonomous until review, never autonomous at filing.”
- “No source, no legal claim. No lawyer approval, no export.”

## Requirements

- Node.js 20.9 or newer; an active LTS release is recommended.
- pnpm 10 or newer.
- A modern browser with localStorage enabled.

If pnpm is unavailable, use:

```sh
corepack enable && corepack prepare pnpm@latest --activate
```

On Windows PowerShell systems that block the `pnpm.ps1` shim, the equivalent executable is `pnpm.cmd`.

## Install and run

```sh
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

Root commands:

```sh
pnpm dev        # Next.js client only
pnpm lint       # ESLint with zero warnings
pnpm typecheck  # strict TypeScript, no emit
pnpm build      # production Next.js build
pnpm check      # lint, type-check, and build
```

No backend process is started by any root command.

## Frontend demonstration credentials

- Email: `attorney@legalbridge.demo`
- Password: `LegalBridge@2026`
- Attorney review PIN: `2026`

These values are local frontend demonstration credentials, not production authentication. The password and PIN are not persisted.

## Demonstration walkthrough

1. Open `/`, read the prototype notice, and choose **Enter Demo Workspace**.
2. Sign in with the demonstration credentials.
3. Open **Nayak Property Papers Matter**.
4. Review browser-local document metadata.
5. Start the fixed 15-agent workflow, pause it, resume it, inspect a node, and allow it to complete.
6. Inspect the conflicting arrest times in Timeline, then the arrest, seizure, and witness comparisons in Contradictions.
7. Review the four cautiously phrased potential concerns and the five closed synthetic authority records.
8. Open Strategy, then Ethics, and reject the unsupported intentional-fabrication allegation.
9. Open Motion Studio and confirm the Citation Firewall shows 9/9 resolved, 0 phantom citations, 0 unsupported final claims, and 1 ethics rejection.
10. Open Attorney Review, enter a reviewer name, PIN `2026`, accept responsibility, and approve the exact version.
11. Use **Print or Save as PDF**. No court filing occurs.
12. Edit and save the motion; verify approval is revoked and export locks immediately.
13. Inspect the audit log and deterministic observability dashboard.
14. Use Settings to reset the browser-local demo.

## Repository structure

```text
.
├── client/                   Next.js frontend
│   ├── public/               Original icon and social preview
│   └── src/
│       ├── app/              App Router routes and boundaries
│       ├── components/       Brand, layout, navigation, shared, and UI
│       ├── features/         Product modules
│       ├── lib/              Contracts, mock data, providers, and utilities
│       └── stores/           Versioned Zustand frontend state
├── data/                     Documentation-only synthetic data boundary
├── docs/                     Product, architecture, safety, and demo documents
├── server/                   Future-backend documentation only
├── infra/                    Future-infrastructure documentation only
├── scripts/                  Future repository scripts boundary
└── tests/                    Test strategy documentation
```

## Current frontend behaviour

- Next.js 16 App Router with strict TypeScript and responsive Tailwind styling.
- Public overview, Zod/RHF demo sign-in, hydration-safe client guard, desktop sidebar, and accessible mobile drawer.
- Zustand localStorage persistence with a versioned reset path.
- Deterministic 15-agent workflow with start, pause, resume, reset, node inspection, and refresh survival.
- Local case creation and file metadata validation for PDF, TXT, and DOCX; no binary persistence or upload.
- Source-linked timeline, contradiction comparisons, procedural screening, and closed synthetic authority review.
- Strategy, mandatory Ethics Auditor rejection, editable/versioned motion, Citation Firewall, attorney approval, approval invalidation, print gate, audit history, observability, and settings.
- TanStack Query provider and typed mock/HTTP client boundary. HTTP mode intentionally returns a controlled unsupported-checkpoint error and is not selectable.

## Frontend-only limitations

Authentication, processing, token counts, costs, time-reduction figures, citations, authorities, legal reasoning, and audit records are demonstration behaviour. There is no OCR, PDF/DOCX parsing, real legal research, real citation verification, backend, database, cloud storage, server-side PDF generation, authentication service, malware scanning, or automatic filing.

The file picker discards binary contents after deriving safe metadata. Browser state is neither secure nor authoritative.

## Planned later phases

The next safe phase is a backend foundation with FastAPI, typed contract parity, a health endpoint, configuration validation, Supabase connection planning, and activation of the mock-to-HTTP client boundary. LangGraph, Gemini, secure document processing, retrieval, citation verification, Storage, PostgreSQL/pgvector, SSE, and Docker remain later planned work.

No future component described in this repository is currently implemented.
