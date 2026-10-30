# UAIGOS v3.0.0 — Unified COR Change Guardrail
Version: 2026-10-30. Status: PARTIAL / RELEASE BLOCKED / NOT CERTIFIED.

## Source-of-truth and precedence
Security > Governance > Compliance > Architecture Freeze > Protocol Freeze > Contracts > Domain Rules > Implementation > Optimization > Refactoring.
The authoritative state is the candidate Git commit plus immutable CI receipts, not an agent's conversational summary. The canonical governance repository should mirror this ledger by reviewed PR, not blind overwrites.

## Candidate dependencies
Ugondu: PR #57 -> PR #58 (candidate 8a6e5a27).
Dumcholu: PR #15 -> PR #16 (candidate bc11ea1).
Do not rewrite master or merge stacked changes out of order. This handover branch is separate from both stacks.

## Agent transaction protocol
1. Fetch upstream, record base/head SHA and inspect pending PRs and existing implementations.
2. Acquire an exclusive ownership record for each touched file or bounded context in the shared change ledger; concurrent agents must not overwrite one another.
3. Register a finding ID, exact reproduction, affected paths, severity, acceptance criteria, and intended test BEFORE editing.
4. Implement the physical source change on a dedicated branch. No mock, hardcoded fallback, TODO-as-done, silent skip, or synthetic pass.
5. Add positive, negative and regression tests; run relevant build, security, governance, localization and COR suites. Capture commands, exit codes, logs and commit-bound SHA256 evidence.
6. Compare with upstream and other active PRs. Preserve superior existing architecture and public contracts. No duplicate implementations or silent downgrade.
7. Publish a draft PR with immutable commit SHA, tests, residual risks, rollback procedure and evidence references. Mark unresolved findings BLOCKED, never PASS.
8. Independent reviewer verifies the diff and reproducible evidence before merging. No agent may self-certify COR.

## Portability / federation invariants
One artifact per backend: env-configured Java/Node processes packaged in OCI images; same image runs on Linux Docker/Compose, AWS EC2 and ECS Fargate. No AWS-specific business code, fixed hostnames, embedded secrets or host-dependent entitlements. Shared DirectAdmin hosts static frontends only; no assumption that Java/Node daemons run there.
AeroBill is the sole billing/metering authority; Mandatag is the sole entitlement/licensing authority. Use authenticated TLS, bounded retries/timeouts, idempotency and fail-closed authorization. Never invent local fallback entitlements.
Configuration is injected at runtime via environment/secret references; use external durable database/storage and health/readiness endpoints. Container must be non-root, restart-safe, with graceful shutdown and structured redacted logs.

## Cost-controlled launch decision
Initial AWS staging: prefer one right-sized EC2 host for both isolated backend containers, with resource limits, persistent database backup, least-privilege instance role, private database exposure, budget alerts and scheduled staging shutdown where safe. Production requires explicit cost/security sign-off; do not assume EC2 is automatically cheaper than Fargate after operations, egress, load balancing, backups and high availability.
Design deployment descriptors to allow later ECS Fargate task definitions, without modifying application code. AWS region preference eu-west-3. Do not provision chargeable resources without authorization.

## Release blockers — evidence required
DUM-OPPMAP-FRONTEND-LIVE: replace _getVerifiedOpportunityCatalogue() with authenticated real API calls; replace simulated Timer.periodic with tested SSE reconnection/backoff; inject MapTiler key at runtime.
AWS-STAGING-PHYSICAL: deployed images, real smoke checks, rollback drill, budget receipts and monitoring.
FED-LIVE: signed/authorized AeroBill and Mandatag transactions and negative fail-closed tests.
WEBAUTHN-PHYSICAL: verified authenticator attestation ceremony.
NG-POLICY-CALIBRATION: approved Nigeria-specific dataset and jurisdictional review.
COR-SIGNATURE: independent trusted evidence/signing root verification and explicit certification authority sign-off.

## Change ledger schema (append-only)
finding_id | repository | branch | base_sha | candidate_sha | paths | reproduction | implementation | test_command | result | evidence_sha256 | reviewer | status | rollback
Allowed statuses: OPEN, IN_PROGRESS, TESTED, VERIFIED, BLOCKED, CERTIFIED. Never set CERTIFIED solely from CI success.
