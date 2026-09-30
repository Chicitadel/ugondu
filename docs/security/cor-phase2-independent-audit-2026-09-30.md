# Ugondu COR Level A — Phase 2 Independent Audit
## 2026-09-30

### Audit basis

This audit compares commit `ab60153` and its claimed completion report against the restored/stabilized v3 master plan.

The execution report claims all Dimension A and B work complete and 129/129 tests green. The repository state does contain substantial new implementation across R1–R11, but the certification claim is not yet supportable.

### Findings

| ID | Severity | Finding | Status |
|---|---|---|---|
| COR-01 | CRITICAL | Execution envelope emitted by engine-core was missing the frozen `protocolVersion`, `policyHash`, capabilities, steps, agent identity and used generated placeholder artifact digest. | FIXED on audit branch |
| COR-02 | CRITICAL | Evidence generator hard-coded test counts/results and generated a random signature when the private signing key was absent. | FIXED on audit branch |
| COR-03 | CRITICAL | Evidence verification checked signature length rather than cryptographic validity. | FIXED on audit branch |
| COR-04 | CRITICAL | The claimed 50-class adversarial suite consists of `assert.ok(true)` simulations and does not exercise the attack classes. | OPEN — certification blocker |
| COR-05 | HIGH | Plugin sandbox admission used action names not present in the canonical ten-action protocol (`NPM_INSTALL`, `NPM_BUILD`, etc.). | FIXED on audit branch |
| COR-06 | HIGH | Node plugin emitted `NPM_INSTALL`/`NPM_BUILD` rather than the canonical `NODE_INSTALL` action. | FIXED on audit branch |
| COR-07 | HIGH | Service-token replay cache is process-memory only; replay state disappears on restart and is not durable across instances. | OPEN |
| COR-08 | HIGH | Service-token verification validates audience/scope/time/signature but does not enforce an issuer allowlist or durable JTI replay authority. | OPEN |
| COR-09 | HIGH | Language-pack signing still uses a hardcoded public key and signs only a selected four-field payload rather than the complete canonical manifest + artifact digest. | OPEN |
| COR-10 | HIGH | Progressive autonomy L5/L6 can auto-approve whenever policy violations are empty; trust environment, target health, approval context and recovery guarantees are not represented in the decision. | OPEN |
| COR-11 | HIGH | Discovery and migration implementations are heuristic prototypes rather than complete semantic engines; several defaults are inferred rather than evidence-derived. | OPEN |
| COR-12 | HIGH | Disaster-recovery implementation returns simulated recovery timestamps and `rpoSeconds=0`; this is not a real chaos/recovery test. | OPEN |
| COR-13 | MEDIUM | DORA trend classification contains hard-coded benchmark tiers; the product must distinguish observed customer measurements from analytical thresholds and source attribution. | OPEN |
| COR-14 | MEDIUM | `/v1/keys` exposes trust-root material without an explicit authenticated distribution protocol. Public keys may be public, but trust bootstrap/rotation remains under-specified. | OPEN |
| COR-15 | MEDIUM | Several source headers identify internal “engineering authorities”; this is not itself a security defect, but governance documentation must not be confused with independent assurance. | OPEN |

### Independent conclusion

The commit is a substantial **platform-expansion implementation milestone**, not yet a COR Level A certified release.

The most important false-positive is the 50-class adversarial result. The current suite is structurally a simulation harness, so “50/50 adversarial attacks passed” is not evidence that those attacks were actually attempted.

The evidence generator was also not an independent evidence generator because it previously supplied its own test totals and could create a random signature when no signing key existed.

### Correct release state

```text
R1–R11 implementation breadth       SUBSTANTIALLY PRESENT
COR protocol/security foundation     PARTIAL / HARDENING REQUIRED
Certification evidence integrity     HARDENING REQUIRED
Adversarial assurance                NOT YET PROVEN
Independent certification            BLOCKED
```

### Phase 2 objective

Do not add more roadmap breadth until these certification-integrity blockers are closed.

Next workstream:

1. Replace simulated adversarial checks with executable attack tests.
2. Make service-token replay durable and issuer-bound.
3. Complete trust-registry key lifecycle and evidence-key separation.
4. Complete language-pack canonical signing.
5. Harden autonomy authorization.
6. Replace simulated DR with real failure-injection tests.
7. Replace heuristic discovery/migration claims with explicit capability/evidence states.
8. Re-run all gates from a clean checkout.
9. Generate evidence only from fresh gate results.
10. Require independent security review before any COR Level A claim.

### External security standard alignment

OWASP ASVS 5.0 requires self-contained tokens to be signature-validated, use an algorithm allowlist, obtain validation keys from trusted configured sources, validate validity periods, token purpose and audience, and incorporate authorization claims into access decisions. These requirements reinforce COR-01, COR-07, COR-08 and the trust-registry work above. 

The relevant ASVS requirements include V9.1.1–V9.1.3 and V9.2.1–V9.2.4. urlOWASP ASVS 5.0 token requirementshttps://cornucopia.owasp.org/taxonomy/asvs-5.0/09-self-contained-tokens

## Release decision

**COR Level A: BLOCKED pending Phase 2 closure.**

The roadmap itself is preserved. The blocker is the quality and independence of the evidence used to certify it.
