# Manual test checklist

## Viewports and layout

- [ ] Review `/`, sign-in, dashboard, case modules, dialogs, and print at 360px.
- [ ] Repeat critical pages at 768px, 1024px, and 1440px.
- [ ] Confirm no page-level horizontal overflow; only case-module navigation may scroll horizontally.
- [ ] Confirm desktop sidebar expand/collapse and mobile drawer open/close, Escape, focus trap, and body lock.
- [ ] Confirm long filenames, citation IDs, hashes, and audit entities wrap safely.
- [ ] Confirm motion editor, watermark, approval metadata, and print layout remain readable.

## Keyboard and assistive basics

- [ ] Tab through primary navigation, forms, workflow controls, dialogs, and source details.
- [ ] Confirm visible focus, logical heading order, landmarks, skip link, labels, errors, and descriptive button names.
- [ ] Confirm status is expressed with text/icon, not colour alone.
- [ ] Read chart text summaries without relying on the chart.
- [ ] Enable OS reduced motion and the local setting; confirm transitions reduce.
- [ ] Zoom mobile layouts and confirm controls remain reachable.

## Authentication and navigation

- [ ] Valid demo credentials redirect to `/dashboard`.
- [ ] Invalid email/password shows a useful error.
- [ ] Refresh retains authenticated state without a flash of protected content.
- [ ] Unauthenticated protected routes redirect to sign-in and preserve the destination.
- [ ] Sign-out clears only authentication and redirects.
- [ ] Every sidebar and case-module target renders a useful page.
- [ ] Unknown case and not-found routes offer recovery actions.

## Cases and documents

- [ ] Search and status/review filters work and can produce/clear an empty state.
- [ ] Complete all six case steps; verify per-step validation, audit event, toast, persistence, and redirect.
- [ ] Validate PDF/TXT/DOCX, >10 MB, empty, duplicate, unsupported, unsafe/long name, and >12 records.
- [ ] Remove a pending selection and add accepted metadata.
- [ ] Confirm no network request/upload and no binary localStorage value.
- [ ] Run simulated processing and verify statuses/audit.

## Workflow

- [ ] Start, inspect active/completed/locked nodes, pause, wait, and confirm no progress.
- [ ] Resume and refresh during progress; confirm retained node and no duplicate event.
- [ ] Complete all 15 nodes and confirm the attorney boundary.
- [ ] Reset through confirmation and confirm the case remains.

## Analysis and research

- [ ] Filter timeline to conflicts and expand source excerpts.
- [ ] Activate a source highlight and inspect both arrest times.
- [ ] Review arrest, seizure, and witness contradiction cards.
- [ ] Verify every procedural finding says potential concern/requires verification.
- [ ] Search/filter authorities and inspect applicability/distinguishing facts.
- [ ] Confirm every authority is labelled synthetic and has no real database link.

## Strategy, ethics, motion, citations

- [ ] Include/exclude supported strategies and save notes on blur.
- [ ] Confirm unsupported fabrication candidate is visible but blocked from inclusion.
- [ ] Request revision and approve a safe argument.
- [ ] Reject the required unsupported argument; confirm strategy exclusion and audit.
- [ ] Edit motion, confirm unsaved state, save version, and inspect revision history.
- [ ] Expand Citation Firewall rows and confirm 9/9, 0 phantom, 0 unsupported, 1 rejection.
- [ ] Confirm no rejected allegation appears in the final motion text.

## Approval and export

- [ ] Confirm export locked before approval with unmet reasons.
- [ ] Try blank reviewer, wrong PIN, and unchecked responsibility; none approves.
- [ ] Approve exact version with reviewer, `2026`, and confirmation.
- [ ] Confirm approval version/hash/time/reviewer and unlocked print.
- [ ] Use Print or Save as PDF; confirm audit and “Not automatically filed”.
- [ ] Save a meaningful edit; confirm immediate invalidation, audit event, and locked export.

## Audit, observability, settings, quality

- [ ] Filter/search audit events and confirm approval, export, edit, and invalidation sequence.
- [ ] Confirm deterministic durations, retries, calls, simulated tokens/cost, counts, and text summary.
- [ ] Toggle reduced motion, density, and sidebar preference; refresh and confirm persistence.
- [ ] Reset demo through confirmation; confirm seed case restoration, toast, and valid route.
- [ ] Exercise loading, empty, configuration error, runtime error, locked, pending, and not-found states.
- [ ] Inspect the browser console for uncaught errors and hydration warnings.
- [ ] Run `pnpm check` and confirm no TypeScript suppression, `TODO`, `FIXME`, dead link, or inactive control.
