# Citation Firewall

## Purpose

The Citation Firewall prevents a draft from appearing exportable when its factual or legal propositions cannot be traced and reviewed. A green interface state is necessary but never sufficient for legal reliability; attorney verification remains mandatory.

## Checks

1. **Source existence:** the cited source record must resolve.
2. **Metadata verification:** title, type, jurisdiction, date, and source identity must match the underlying record.
3. **Quotation verification:** quoted wording must match the resolved passage.
4. **Page or paragraph verification:** the location must be reproducible.
5. **Proposition support:** the passage must support the specific sentence, not merely relate to the topic.
6. **Jurisdiction applicability:** the authority must be relevant to the forum and issue.
7. **Temporal applicability:** the authority must remain effective for the material time.
8. **Distinguishing facts:** differences that weaken application must be visible.
9. **Factual grounding:** the motion’s facts must trace to verified case sources.
10. **Legal grounding:** legal propositions must trace to verified, applicable authority.

## Blocking rules

Export is blocked for a missing source, metadata/quotation/location failure, unsupported final proposition, unresolved jurisdiction/time issue, included Ethics Auditor rejection, missing attorney approval, invalidated approval, or content changed since approval.

An attorney may revise or remove a proposition, supply an authentic source, or distinguish an authority. An attorney override must never turn a missing source into a verified source.

## Current synthetic behaviour

The frontend fixture has nine citation records. Each closed record reports all ten checks as passed and produces these deterministic metrics:

- 9 legal citations detected
- 9 source records resolved
- 9 quotations verified
- 9 propositions supported
- 0 phantom citations
- 0 unsupported final claims
- 1 unsupported candidate argument requiring Ethics Auditor rejection

These values exercise the interface only. No real database, judgment, statute, quotation, jurisdiction, or applicability was checked.

## Future backend behaviour

A future service must resolve licensed sources, normalise metadata, hash and compare quotations, preserve page/paragraph provenance, evaluate proposition scope, version jurisdiction/time rules, record distinguishing analysis, and return machine-readable blocking reasons. The backend—not hidden UI state—must enforce export eligibility. Every check, revision, approval, invalidation, and generated artifact must enter an immutable audit record.
