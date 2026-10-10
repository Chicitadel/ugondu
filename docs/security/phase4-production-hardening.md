# Ugondu Phase 4 — Production Hardening & Real-Path Qualification

## Status

**ACTIVE — COR Level A remains unissued.**

The Phase 3 task log reports 16/16 gate suites and 50/50 adversarial classes, but an independent repository audit found that several adversarial classes are still synthetic or tautological. Phase 4 converts the assurance suite from security-property assertions into executable attacks against actual production boundaries.

## Findings carried forward

### PH4-01 — Historical secret purge is incomplete
Private signing keys were removed from the current tree and replacement authorities were generated, but historical commits containing compromised private keys remain in repository history.

**Required:** revoke old authorities, confirm replacement public keys, then perform an authorized history rewrite/purge before production release. Verify all refs/tags/branches and hosting-side secret caches as applicable.

### PH4-02 — Clean CI certification has not executed
The dedicated COR workflow is manual-dispatch only and no workflow run is recorded for the Phase 3 certification commit.

**Required:** execute the clean-checkout workflow with CI-provided evidence signing material and retain the signed artifact as release evidence.

### PH4-03 — Evidence test permits clean-checkout absence
The evidence test passes when the bundle is absent unless UGONDU_REQUIRE_EVIDENCE=true.

This is acceptable for development CI but cannot be the release-certification criterion.

**Required:** release certification must force evidence generation and cryptographic verification.

### PH4-04 — Adversarial suite overstates 50 real attacks
The following classes are not yet production-path attacks:
- 3/4: standalone Ed25519 serialization tests
- 9: standalone signature verification
- 26: local variable rollback simulation
- 33: standalone hash comparison
- 37: tenant strings compared to themselves
- 38/39/40: static action/capability/buffer assertions
- 45/46: destination validator calls without actual DNS/redirect execution
- 49: local string sanitization
- 50: local object fallback

**Required:** each class must invoke a production boundary, inject an attacker-controlled condition, observe the production rejection/containment, and record exact evidence.

### PH4-05 — Replay authority is pluggable but not production-distributed
IReplayAuthority exists, but the default implementation is a local filesystem store.

**Required:** implement and integration-test one transactional multi-instance authority for the selected deployment profile.

### PH4-06 — Production deployment qualification is not yet demonstrated
Unit/integration gates do not prove a real deployment lifecycle.

**Required:** execute a controlled non-production deployment through the actual client/engine/target path, then repeat, interrupt/resume, rollback, and verify telemetry/audit persistence.

## Phase 4 workstreams

### W1 — Repository history remediation
1. Produce a secret exposure inventory.
2. Confirm every v1 key is revoked.
3. Purge compromised private key blobs from Git history using an approved repository-maintenance procedure.
4. Re-clone from the rewritten canonical repository.
5. Verify no private key remains in any reachable ref.
6. Rotate replacement authorities again if history purge occurs after their exposure window.

### W2 — Certification pipeline
1. Make the certification workflow the authoritative release gate.
2. Force UGONDU_REQUIRE_EVIDENCE=true.
3. Generate evidence only after all tests pass.
4. Sign evidence with a CI-held evidence authority.
5. Verify evidence against exact HEAD and tree.
6. Upload evidence as immutable CI artifact.
7. Record workflow run ID and artifact digest in release metadata.

### W3 — Real adversarial harness
Create an attack-case schema: id, threatClass, targetBoundary, attackerInput, setup, execution, expectedContainment, observedEvidence.

A class cannot be counted as production-path unless:
- it reaches a production module;
- attacker input is externally controllable;
- the expected security control executes;
- the result is asserted from the production result;
- no tautological assertion can satisfy the test.

### W4 — Distributed replay authority
Implement:
- atomic record-if-absent;
- expiry;
- issuer/key/audience/jti composite identity;
- concurrency test with multiple workers;
- restart test;
- multi-instance test;
- failure-mode fail-closed test.

### W5 — SSRF execution path
Test actual outbound request handling:
- DNS resolution;
- IPv4/IPv6;
- DNS rebinding;
- redirects;
- private/loopback/link-local/metadata targets;
- scheme and port restrictions;
- connection-time destination revalidation.

### W6 — Production deployment qualification
Required scenario matrix:
1. first deployment;
2. repeated idempotent deployment;
3. interrupted deployment;
4. resume;
5. rollback;
6. failed health verification;
7. unauthorized tenant;
8. forged recipe;
9. revoked key;
10. telemetry/audit verification.

### W7 — AI autonomy authorization
The Phase 4 gate must prove that L5/L6 cannot execute merely because a policy-violation list is empty. Execution must require trusted context, target authorization, health evidence, rollback readiness, capability intersection, and appropriate approval/autonomy policy.

### W8 — Evidence-backed analytics
DORA, discovery, migration, simulation and DR results must distinguish observed measurements, deterministic calculations, benchmark classifications, and projections/estimates.

No benchmark label is evidence of observed operational performance.

## Phase 4 exit criteria

All of the following must be true:

- historical compromised private key material purged from reachable repository history;
- replacement authorities verified;
- clean-checkout certification workflow executed successfully;
- signed evidence independently verified;
- 50 adversarial classes are production-path or explicitly reclassified;
- distributed replay authority passes concurrency/restart/failure tests;
- real SSRF execution-path tests pass;
- controlled deployment lifecycle passes;
- L5/L6 authorization gates pass;
- no unresolved CRITICAL/HIGH release findings;
- release evidence identifies exact commit, tree, workflow run and artifact digest.

**No COR Level A claim is made before these conditions are demonstrated.**
