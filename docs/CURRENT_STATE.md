# Current state

Updated: 29 July 2026

## Completed

- Repository foundation, pnpm workspace, root commands, and project documentation.
- Next.js 16.2.12 App Router frontend with React 19.2, strict TypeScript, Tailwind CSS, shadcn-style primitives, local assets, metadata, and print rules.
- Public landing page, disclaimers, demo sign-in, persisted client guard, responsive shell, collapsible desktop sidebar, mobile drawer, breadcrumbs, toast system, loading/error/not-found/configuration states.
- Dashboard, case search/filtering, six-step local case wizard, case overview, file metadata validation, deterministic processing, 15-agent workflow controls and inspection.
- Timeline, contradiction matrix, procedural audit, closed synthetic research, strategy, ethics, Motion Studio, Citation Firewall, attorney review, print gate, audit history, observability, preferences, and safe demo reset.
- Typed API contracts, mock client, controlled unavailable HTTP adapter, query keys, and TanStack Query provider.
- Original SVG icon and generated local social preview.

## Completed routes

`/`, `/sign-in`, `/dashboard`, `/cases`, `/cases/new`, `/cases/[caseId]`, `/cases/[caseId]/documents`, `/cases/[caseId]/workflow`, `/cases/[caseId]/timeline`, `/cases/[caseId]/contradictions`, `/cases/[caseId]/procedural-audit`, `/cases/[caseId]/research`, `/cases/[caseId]/strategy`, `/cases/[caseId]/ethics`, `/cases/[caseId]/motion`, `/cases/[caseId]/review`, `/cases/[caseId]/audit-log`, `/observability`, and `/settings`.

## Commands

`pnpm install`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `pnpm check`.

## Verification

- Dependency installation: pass with pnpm 11 build approvals restricted to `sharp` and `unrs-resolver`.
- Staged public-shell lint/type/build: pass.
- Staged case/workflow lint/type/build: pass.
- Staged analysis/research lint/type/build: pass.
- Staged strategy/ethics/motion/review lint/type/build: pass.
- Final Stage 8 checks and localhost browser exercise: recorded after the final verification run below.

## Data mode and limitations

The current data mode is `mock`, defaults safely without an environment file, and uses deterministic fixtures plus versioned localStorage state. There is no production authentication, secure persistence, real parsing, OCR, model call, legal corpus, legal citation verification, backend, database, storage service, cloud deployment, server-side PDF, or filing integration.

## Phase boundary

Frontend-only checkpoint. Backend work has not started. The next approved phase is a minimal FastAPI foundation with contract parity, configuration, a health endpoint, Supabase connection planning, and activation planning for the typed HTTP adapter.

## Git status

The repository began empty except for `.git`, on branch `main`, with remote `origin` unchanged. Final modified/untracked summary is recorded after verification; no commit, stage, push, branch change, or remote change is authorised or performed by this checkpoint.
