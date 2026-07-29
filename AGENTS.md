# LegalBridge India repository guidance

LegalBridge India (problem statement `SDGGAIP016`) is an attorney-assistance hackathon prototype aligned with SDG 16.3 and SDG 10.3. Its operating principles are “Autonomous until review, never autonomous at filing” and “No source, no legal claim. No lawyer approval, no export.”

## Current phase

This repository is at the verified frontend-only checkpoint. Work may cover the Next.js client, deterministic synthetic fixtures, typed frontend contracts, local browser state, tests, and documentation. The `server/` directory is documentation-only. Stop after the frontend checkpoint unless a later user request explicitly authorises the next phase.

## Approved stack

- pnpm workspace without Turborepo or Nx
- Next.js App Router, React, strict TypeScript, Tailwind CSS, and shadcn/ui conventions
- Lucide React, Motion, React Hook Form, Zod, TanStack Query, Zustand, Recharts, Sonner, date-fns, clsx, and tailwind-merge
- Future planning only: FastAPI, Pydantic, LangGraph, Gemini, Supabase PostgreSQL/pgvector/Storage, and Server-Sent Events

## Root commands

- `pnpm install`
- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm check`

`pnpm dev` starts only the client at `http://localhost:3000`.

## Coding rules

- Keep TypeScript strict; do not use `any`, `@ts-ignore`, dead code, commented-out implementation blocks, or inert controls.
- Keep mock fixtures, contracts, state transitions, API adapters, and presentation separate.
- Use deterministic data and stable IDs for seeded records.
- Do not persist file binaries, passwords, review PINs, secrets, or real personal data.
- Tie approval to the saved motion version and mock hash. Any meaningful saved edit must invalidate approval and lock export.
- Every route, button, tab, link, error, empty state, locked state, and loading state must provide a real action or explanation.
- Phrase results as potential concerns, source-linked observations, demonstration analysis, and matters requiring attorney verification.

## Accessibility and responsiveness

- Use semantic HTML, correct headings, labelled inputs, accessible errors, keyboard-operable dialogs and navigation, visible focus states, non-colour status cues, and textual chart summaries.
- Respect both `prefers-reduced-motion` and the local reduced-motion setting.
- Support 360px, 768px, 1024px, and 1440px without page-level horizontal overflow.
- Convert wide comparisons into stacked mobile cards; wrap long filenames and identifiers safely.
- Keep touch targets comfortable and legal-document line lengths readable.

## Repository safety

- Preserve `.git`, history, remotes, the current branch, and user files.
- Never use `git reset --hard`, `git clean -fd`, destructive checkout, force-push, or remote/branch rewrites.
- Do not commit, stage, or push unless the user explicitly asks.
- Do not install packages globally.
- Never add secrets or production credentials. Nothing secret belongs in `NEXT_PUBLIC_*`.

## Forbidden technologies and actions

Do not add npm or Yarn workflows, Pages Router, Redux, Material UI, Bootstrap, jQuery, Firebase, Clerk, Auth0, blockchain, microservices, Kubernetes, real legal corpora, automatic court filing, or paid/API-key services in this phase.

Do not implement Python, FastAPI, Pydantic, LangGraph, Gemini calls, Supabase, PostgreSQL, pgvector, Storage, SSE, Docker, OCR, real document parsing, a database migration, backend endpoints, or cloud deployment during this checkpoint.

## Verification

After a material frontend stage, run lint, type-check, and production build, fix root causes, and rerun. Before handoff run `pnpm check`, start `pnpm dev`, inspect representative routes, confirm no backend starts, and update `docs/CURRENT_STATE.md` with actual results and Git status.
