# Security

## Threat model

Future users may handle sensitive legal documents, personal data, privileged communications, custody records, and litigation strategy. Threats include cross-tenant access, stolen credentials, insecure object URLs, malicious files, prompt injection inside uploaded records, citation poisoning, model data leakage, forged approvals, audit tampering, retention failures, and misleading automation.

## Required future controls

- Least-privilege service and user roles with organisation and case isolation.
- Server-side authorisation on every record and object operation.
- Encryption in transit and at rest with managed key rotation.
- Secrets in a trusted server-side manager; never in source or `NEXT_PUBLIC_*`.
- Short-lived upload/download grants and non-guessable storage keys.
- MIME, extension, size, magic-byte, decompression, and structural validation.
- Malware scanning and quarantine before parsing.
- Sandboxed extraction with resource/time limits and no document-driven code execution.
- Clear separation of uploaded text from system instructions to resist prompt injection.
- Retrieval allowlists, provenance, licensed-source identity, quote hashes, and anti-poisoning review.
- Immutable/tamper-evident audit events and version-bound approvals.
- Configurable retention, deletion, legal hold, export, and subject-access workflows.
- Monitoring that excludes privileged content and secrets.

## Human approval

No workflow status, Ethics Auditor decision, model confidence, or citation score substitutes for attorney judgment. Export requires a valid server-enforced approval bound to immutable content. Any content change invalidates the approval. Missing sources cannot be overridden.

## Current frontend limitations

This checkpoint has no secure authentication, authorisation, network service, encrypted database, object storage, malware scanning, model, or secure audit system. localStorage can be viewed or modified by the device user and is never trusted as a security boundary.

The file picker discards binaries after metadata validation. It does not read, upload, scan, parse, or retain file content. The demo stores no password, PIN, API key, secret, or real legal record. All identities and authorities are synthetic.
