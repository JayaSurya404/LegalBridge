# Frontend API contracts

No endpoint in this document is implemented. The frontend defaults to a local `MockLegalBridgeClient`. `HttpLegalBridgeClient` is typed but returns `Backend not available in this frontend checkpoint`.

## Common envelope and errors

Successful future responses use `{ data, mode, generatedAt }`. Current `mode` is only `mock`. Controlled client errors use `NOT_FOUND`, `UNAVAILABLE`, or `INVALID_CONFIGURATION`.

## Data mode

`NEXT_PUBLIC_DATA_MODE=mock` is the only accepted public value and the safe default. No backend URL, API key, or secret exists.

## Planned endpoint map

| Domain | Planned method/path | Request | Response |
| --- | --- | --- | --- |
| Authentication | `POST /v1/auth/session` | email or future identity assertion | authenticated user/session summary |
| Cases | `GET /v1/cases` | filters | case summaries |
| Cases | `POST /v1/cases` | typed case identity and context | case record |
| Cases | `GET /v1/cases/{caseId}` | case ID | case record |
| Documents | `POST /v1/cases/{caseId}/documents` | validated metadata/upload token | document record |
| Documents | `GET /v1/documents/{documentId}` | document ID | metadata and processing state |
| Workflow | `POST /v1/cases/{caseId}/workflow/commands` | start/pause/resume/reset | workflow run |
| Workflow | `GET /v1/workflows/{runId}` | run ID | node/run state |
| Timeline | `GET /v1/cases/{caseId}/timeline` | filters | source-linked events |
| Contradictions | `GET /v1/cases/{caseId}/contradictions` | severity/review filters | contradiction records |
| Procedural audit | `GET /v1/cases/{caseId}/procedural-findings` | filters | cautiously phrased findings |
| Authorities | `GET /v1/cases/{caseId}/authorities` | search/type/posture | licensed authority records |
| Citation checks | `GET /v1/motions/{motionId}/citation-checks` | motion version | verification results |
| Strategy | `GET/PUT /v1/cases/{caseId}/strategies` | inclusion and attorney notes | versioned strategy |
| Ethics | `POST /v1/cases/{caseId}/ethics-decisions` | argument, action, reason | ethics decision |
| Motions | `GET/POST /v1/cases/{caseId}/motions` | draft/version command | motion version |
| Approval | `POST /v1/motions/{motionId}/approvals` | reviewer assertion, version, hash, responsibility | approval |
| Approval | `DELETE /v1/approvals/{approvalId}` | invalidation reason | invalidated approval |
| Audit | `GET /v1/cases/{caseId}/audit-events` | filters/cursor | immutable events |
| Observability | `GET /v1/workflows/{runId}/observability` | run ID | labelled operational metrics |

## Contract domains

Authentication must distinguish identity, organisation membership, role, and session expiry. Case contracts own fictional/real-data classification and jurisdiction. Document contracts own MIME, size, hash, storage reference, validation, page count, and processing status without returning unsafe raw content.

Facts require source-span IDs and confidence. Timeline events aggregate facts but cannot erase provenance. Contradictions include both statements and sources. Procedural findings include rationale, missing information, confidence, review action, and disclaimer.

Authorities require licensed source identity, official metadata where available, jurisdiction, date, passages, retrieval provenance, and applicability. Citation checks separately report source existence, metadata, quotation, location, proposition, jurisdiction, time, distinguishing facts, factual grounding, legal grounding, and blocking reasons.

Strategies and ethics decisions are versioned. Motions contain immutable versions plus editable draft state. Approvals bind reviewer identity, time, version, content hash, and responsibility acknowledgement. Any changed content creates an invalidation event.

Audit events carry ID, organisation, case, type, message, timestamp, actor, related entity, and safe metadata. Observability distinguishes measured values from estimates and never treats token/cost metrics as legal-quality signals.
