# Ugondu Phase 3 — Production Qualification & Release Integrity

## Status

**IN PROGRESS — certification remains blocked.**

Phase 3 begins from the independently reconciled state of `stabilization/cor-audit-phase2`. The purpose is to convert the platform expansion into a reproducible, externally verifiable release candidate.

## Audit findings carried into Phase 3

1. **Signing-key exposure:** Phase 2 committed private Ed25519 keys for evidence, plugin, language-pack, service identity, and recipe signing. The keys are removed from the Phase 3 tip, but their historical exposure means they must be treated as compromised and rotated before production use.
2. **Evidence self-reference:** the Phase 2 evidence bundle was committed after generation and therefore its embedded commit/tree identity did not attest the final certifying commit. Phase 3 keeps generated evidence outside the source tree and binds evidence to the exact HEAD/tree being tested.
3. **DR realism:** state corruption was a real filesystem fault, but the NETWORK_PARTITION and TARGET_CRASH branches only advanced counters/timestamps. Phase 3 replaces those branches with real local TCP and OS-process fault injection.
4. **Signing separation:** production signing now requires external secret material; repository files provide verification public keys only.
5. **Release gate:** `scripts/verify-release-integrity.js` rejects tracked private keys and tracked generated certification artifacts and validates evidence-to-HEAD binding when a local evidence bundle is present.

## Mandatory Phase 3 gates

### P3.1 Secret remediation
- Rotate every signing key that appeared in Git history.
- Provision replacement private keys through an approved secret manager / CI secret store.
- Keep only public verification keys in Git.
- Enable GitHub secret scanning and push protection.
- Decide whether historical key material requires repository-history purge after rotation.

### P3.2 Evidence integrity
- Generate evidence only after the target commit is immutable.
- Keep evidence and raw test results as CI artifacts, not tracked source.
- Verify the Ed25519 signature independently.
- Verify evidence `gitCommitHash` and `gitTreeHash` against the tested checkout.
- Require zero failed, skipped, or not-run suites.

### P3.3 Real fault injection
- STATE_CORRUPTION: corrupt, detect, quarantine and restore durable state.
- NETWORK_PARTITION: establish a real TCP connection, break the endpoint, observe connection failure, restore endpoint and verify recovery.
- TARGET_CRASH: terminate a real worker process, observe exit, restart a replacement and verify health.

### P3.4 Clean-checkout qualification
- Fresh clone.
- Install dependencies from lockfiles.
- Build all server packages and Go client.
- Run the complete gate matrix.
- Run release-integrity gate.
- Generate signed evidence using CI-provided private material.
- Verify evidence against the exact checkout.

### P3.5 Production deployment qualification
- First controlled deployment on a non-production target.
- Repeat deployment.
- Rollback.
- Resume after interrupted execution.
- Cross-tenant authorization denial.
- Plugin signature rejection.
- SSRF denial and redirect revalidation.
- Language-pack installation, activation and rollback.
- Real telemetry and audit trail persistence.

## Certification rule

Passing the existing 129 assertions is **not by itself** sufficient for COR Level A. Certification requires reproducible execution from a clean checkout, uncompromised rotated signing authorities, cryptographically verified evidence bound to the exact release commit/tree, and real external/operational validation.

## External standard reference

The token controls are aligned with OWASP ASVS 5.0 requirements for digital-signature validation, algorithm allowlisting, trusted verification-key sources, validity windows, token purpose, and audience restrictions.
