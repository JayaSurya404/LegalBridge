# Product requirements

## Users and goals

The primary user is a legal-aid lawyer reviewing a matter under time and resource pressure. Secondary demonstration users are supervisors and hackathon evaluators. Users need to organise source material, trace observations, compare conflicts, inspect potential procedural concerns, review closed synthetic authorities, reject unsupported arguments, edit a draft, and retain personal responsibility for any legal action.

## Core journeys

1. Understand the prototype and disclaimers, then enter the local demo.
2. Sign in with closed credentials and open or create a synthetic case.
3. Validate local document metadata and run/pause/resume the deterministic workflow.
4. Trace the timeline, contradictions, potential concerns, and research back to source labels.
5. select defensible strategies and reject the unsupported fabrication allegation.
6. edit and save a motion, inspect the Citation Firewall, and approve the exact version.
7. print only after approval, then verify that a later edit revokes approval.
8. inspect audit/observability records and safely reset the demo.

## Functional requirements

- All 19 specified routes and navigation targets must render a useful state.
- Demo authentication must accept only the closed email/password, persist no password, redirect unauthenticated protected routes, and support sign-out.
- Cases must support search, status and review filters, local creation, and first-run synthetic data.
- Document selection must validate extension/type, 10 MB size, empty files, duplicates, safe name, and a 12-record frontend cap; binary content must be discarded.
- Workflow must expose fixed ordering, start, pause, resume, reset confirmation, node inspection, retained progress, and audit events.
- Analysis, authority, strategy, ethics, motion, citation, review, export, audit, observability, and settings behaviour must follow the closed deterministic fixtures.
- Approval must bind to the latest saved version/hash and become invalid on a meaningful saved edit.
- Print must never represent or trigger court filing.

## Non-functional requirements

- Production build, zero-warning lint, and strict type-check must pass.
- Primary flows must work without network, environment secrets, backend, or database.
- State transitions must be deterministic and refresh-safe.
- Timers must be cancellable and duplicate audit events avoided.
- Content must remain readable and page-overflow-free at 360, 768, 1024, and 1440 pixels.

## Safety and legal requirements

- All data, identities, forums, sources, and authorities are fictional.
- Every authority says it is a demonstration record, not a verified corpus.
- Findings are potential concerns requiring attorney verification, never declarations of violations.
- The product is never described as official, government approved, final advice, court-ready, or automatically filed.
- Missing sources, unsupported final claims, included rejected arguments, missing approval, invalid approval, or motion changes block export.
- Missing sources cannot be overridden by an attorney in the future design.

## Accessibility

Semantic landmarks and headings, visible labels, accessible errors, keyboard navigation, focus visibility, status text plus icons, reduced-motion support, large touch targets, focus-trapped dialogs/drawers, and textual chart summaries are required.

## Demo acceptance criteria

The complete walkthrough in `DEMO_SCRIPT.md` succeeds without source changes; the metrics show 9/9, 0 phantom, 0 unsupported, and 1 ethics rejection; approval unlocks print; a saved edit relocks it; audit history records the sequence; no console-breaking error, secret, backend process, dead navigation item, or automatic filing action exists.
