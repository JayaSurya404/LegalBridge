# Repository scripts boundary

No custom executable script is required in the frontend checkpoint. pnpm root commands own installation, development, lint, type-check, build, and the combined check.

Future scripts should be narrow, cross-platform where practical, non-destructive by default, and documented with inputs and outputs. They must not rewrite Git history, expose secrets, download legal corpora, or silently mutate production data.
