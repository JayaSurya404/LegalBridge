# Test boundary

The current automated gates are ESLint, strict TypeScript, and the Next.js production build. The comprehensive manual acceptance checklist is in `docs/TEST_CHECKLIST.md`.

A later frontend quality phase may add component and browser tests for authentication guard behaviour, case creation, upload validation, workflow timers, persistence, ethics rejection, approval/version binding, invalidation, print eligibility, accessibility, and viewport overflow. Tests must use deterministic synthetic fixtures and no backend.
