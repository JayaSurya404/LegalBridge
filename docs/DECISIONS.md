# Architecture decisions

| Decision | Rationale and status |
| --- | --- |
| One Git repository | Keeps the hackathon foundation understandable and preserves a single history. Implemented. |
| Separate `client/` and `server/` | Makes the frontend/backend boundary visible. `server/` is documentation-only. |
| Simple pnpm workspace | Provides root commands without Turborepo, Nx, or orchestration overhead. Implemented. |
| pnpm only | Produces one root lockfile and meets the repository constraint. npm and Yarn are not supported workflows. |
| Next.js App Router | Supplies layouts, route groups, metadata, loading/error boundaries, and future server capabilities. Implemented. |
| Strict TypeScript | Makes local workflow, approval, citation, and contract states auditable. Implemented without suppression. |
| Frontend first | Enables a complete, testable demonstration before introducing operational risk. Implemented. |
| Deterministic synthetic data | Keeps the demo repeatable, offline, fictional, and safe from false legal claims. Implemented. |
| Zustand local state | Fits device-local workflow controls and explicit approval transitions. Implemented with versioned persistence. |
| TanStack Query boundary | Establishes the future server-state seam without pretending endpoints exist. Implemented as provider, contracts, and keys. |
| FastAPI later | Appropriate typed Python boundary, but forbidden in this checkpoint. Planned only. |
| Supabase later | Potential PostgreSQL, pgvector, and object-storage platform after security design. Planned only. |
| LangGraph later | Potential durable agent graph after the golden path and server controls exist. Planned only. |
| Gemini later | Potential model integration after evaluation, grounding, and secret management exist. Planned only. |
| Docker after the golden path | Avoids infrastructure work before application contracts and controls are proven. Planned only. |
| No automatic filing | Product and safety invariant. No filing control or endpoint exists. |
| Attorney approval before export | Product invariant. Implemented as exact version/hash binding and immediate invalidation on edit. |
