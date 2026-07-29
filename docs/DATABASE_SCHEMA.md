# Planned database schema

This is future planning only. No SQL, migration, database, Supabase project, or backend implementation exists.

All tenant-owned tables would include organisation scope, creation/update times, retention classification, and row-level access controls.

| Entity | Planned core fields and relationships |
| --- | --- |
| Users | identity subject, email, display name, status; memberships join organisations |
| Organisations | name, jurisdiction policy, retention policy, security settings |
| Cases | organisation, reference, title, parties, allegation summary, jurisdiction, status, synthetic flag |
| Documents | case, safe filename, MIME, size, content hash, storage key, validation and processing state |
| Document pages | document, page number, extracted text reference, OCR confidence, render key |
| Facts | case, canonical proposition, confidence, extraction run, attorney status |
| Source spans | fact/document/page, paragraph or offsets, exact excerpt hash, bounding data |
| Timeline events | case, timestamp/range, title, confidence, verification status |
| Contradictions | case, topic, fact/span A, fact/span B, severity, confidence, resolution |
| Procedural findings | case, issue, rationale, missing information, confidence, review status |
| Authorities | licensed source, official metadata, jurisdiction, court/type, date, canonical citation |
| Authority passages | authority, paragraph/page, text hash, licensed retrieval reference |
| Citation checks | motion version, authority passage, proposition, ten check results, overall block |
| Strategies | case, version, factual/legal basis, weaknesses, missing evidence, inclusion |
| Ethics reviews | strategy/argument version, decision, reason, reviewer/agent run |
| Motions | case, current draft pointer, lifecycle status |
| Motion versions | motion, sequence, immutable content, content hash, created by/at |
| Attorney approvals | motion version, reviewer, signed responsibility assertion, content hash, valid/invalid state |
| Audit events | organisation/case, type, actor, entity, immutable safe metadata, timestamp |
| Workflow runs | case, graph version, status, current node, started/completed timestamps |
| Agent runs | workflow, agent ID/version, input/output provenance, status, duration, retries, metrics |

Vector columns may later attach to authorised document spans and authority passages, never replacing source records. Storage objects would be referenced by opaque keys; file bytes would not live in PostgreSQL. Approvals and audit events require append-only or tamper-evident design. Deletion must respect legal hold, retention, and organisation isolation.
