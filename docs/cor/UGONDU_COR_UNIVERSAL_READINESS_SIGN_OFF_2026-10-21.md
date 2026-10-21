# Ugondu COR Universal Readiness — Sign-off Record (Withheld)

- **Product:** Ugondu — Universal Delivery Operating System
- **Legal entity:** Air Roofers SASU
- **Governing body:** Ujomor Systems Engineering & Governance Authority
- **Record date:** 2026-10-21
- **Candidate:** `ce1c3b8dea432bcbc0588504ad0e48f7bac94bf5` (`phase4/production-hardening`, PR #3)
- **Verification record:** [UGONDU_COR_UNIVERSAL_READINESS_REAUDIT_2026-10-21.md](./UGONDU_COR_UNIVERSAL_READINESS_REAUDIT_2026-10-21.md)
- **Decision:** 🔴 **WITHHELD — NOT COR CERTIFIED**
- **Status of this record:** Intentionally unsigned. Universal certification remains strictly withheld until live AWS IAM role assignment and zero-residual physical lifecycle verification are completed.

## Basis for Withholding

1. **AWS Live IAM Role Assumption & Physical Mutation**: In CI run `39529554197`, the `aws-physical-gate` failed closed (exit code 254) due to missing `sts:TagSession` permission on the target execution role. Live deployment, health verification, rollback, and residual cleanup have not yet been executed on physical AWS infrastructure.
2. **Authoritative Gate Enforcement**: The newly implemented `cor-final-release-gate` evaluated `cor=success aws-physical-gate=failure` and rejected release certification.
3. **Unassessed Adapters**: Non-qualified hosting targets (e.g., Plesk, Kubernetes live mutation) remain strictly categorized as experimental or roadmap-only.

## Progress Completed on Candidate `ce1c3b8d`

- [x] **P0-A**: Untagged AWS role-assumption fallback completely removed from `.github/workflows/cor.yml` and guarded by test suite `COR-WF-001..003`.
- [x] **P0-B**: Authoritative `cor-final-release-gate` (`if: always()`, `needs: [cor, aws-physical-gate]`) actively rejects release sign-off when any mandatory gate fails or is skipped (`COR-WF-004..006`).
- [x] **P0-C**: Streaming full git history scanner in `scripts/release/secret-scan.mjs` eliminates memory buffer blowout and scans all 445 historical commits with fail-closed error handling.
- [x] **P1-A**: DirectAdmin adapter cleanly isolated from cPanel in `server/engine-core/src/targets/fabric.ts` and `directadmin.ts`.
- [x] **P1-B**: Differential deploy route parity proven across 5 client profiles and AI credential states (`deploy-mode-parity.spec.ts`).
- [x] **P1-C**: Dual format verbs restored in 12-locale translation bundles (`locale_detect_recom_install`).
- [x] **CI Matrix Verification**: 17/17 jobs passed in CI/CD pipeline run `39529554270` (PR #3) and run `39529559014` (push).
- [x] **Brand Assets Audit**: 14/14 assets verified in run `39529558981`.

## Actions Required Before Withholding May Be Lifted

- [ ] Grant `sts:TagSession` permission to GitHub Actions OIDC role in AWS IAM.
- [ ] Execute full physical qualification lifecycle (provision, verify, rollback, cleanup) with zero residuals.
- [ ] Re-run COR certification workflow with both gates green.
- [ ] Authorize final release signatures.

## Signature Record (Intentionally Unsigned)

| Role | Signatory | Evidence / Review Reference | Date | Status |
|---|---|---|---|---|
| Engineering Authority | To be assigned | CI Run `39529554270` | — | ⚪ Pending AWS IAM |
| Security Authority | To be assigned | `secret-scan.mjs` (445 commits verified) | — | ⚪ Pending AWS IAM |
| Platform Authority | To be assigned | 5 Go Targets + 9 Microservices | — | ⚪ Pending AWS IAM |
| Cloud Operations Authority | To be assigned | Run `39529554197` (`aws-physical-gate`) | — | 🔴 Blocked (TagSession) |


---

## Addendum — Decision reaffirmed after universal platform/host re-audit (2026-10-21)

**Decision:** 🔴 **WITHHELD — NOT COR CERTIFIED.** This sign-off stays intentionally unsigned.

### New findings that also prevent approval

1. **Candidate identity mismatch:** current PR #3 head is reported as `be67628bd26abf18886e958e8467dbb8492d32bc`, while the prior re-audit references `ce1c3b8dea432bcbc0588504ad0e48f7bac94bf5`. Previous evidence must not be reused until candidate SHA is reconciled and mandatory gates run on the exact same candidate.
2. **DirectAdmin discovery evidence is not trustworthy yet:** `server/engine-core/src/targets/directadmin.ts` generates default/sample domains, database identifiers, certificate expiry, health, backup, owner, pricing and recovery facts when observations are absent. These must be removed from production-discovery paths or represented as `UNKNOWN/UNOBSERVED`, and each positive fact must carry provider provenance.
3. **Secret scanner error paths need fail-closed remediation:** `scripts/release/secret-scan.mjs` has branches that suppress tracked-file enumeration errors, unreadable files, and malformed allowlist data by continuing or returning an empty list. A partial scan must never be reported as clean.
4. **Entrypoint parity is incomplete:** `server/engine-core/src/routes/__tests__/deploy-mode-parity.spec.ts` explicitly does not prove that CLI, IDE, UI or automation entrypoints call the tested routes. Real-process E2E evidence is still required.

### Conditions before sign-off

- [ ] Exact full SHA is identical across PR head, branch, checkout, test evidence, artifacts, release manifest and sign-off.
- [ ] AWS OIDC tagged role assumption succeeds with least privilege and no untagged fallback.
- [ ] Physical AWS provision/deploy/readiness/failure recovery/rollback/teardown all execute; independent zero-residual scan passes.
- [ ] DirectAdmin production discovery has no invented environment facts and passes adversarial evidence-provenance tests.
- [ ] Secret scanner fails closed for enumeration, read, history, parser and allowlist failures, with auditable coverage.
- [ ] End-to-end entrypoint parity covers each advertised CLI/UI/API/IDE/automation client and both model-assisted and model-free operation.
- [ ] Per-target qualification is completed for each marketed cloud, VPS, panel, shared/private host, operating system and runtime tuple; every untested target remains explicitly unavailable/unassessed.
- [ ] Fine-grained manual approvals, unattended automation, rollback/resume, localization/RTL/accessibility, SSRF/replay/tenant-isolation and autonomy authorization gates pass on the exact candidate.
- [ ] Every mandatory workflow job succeeds; no skipped/cancelled/failed mandatory jobs.
- [ ] Independent engineering, security, platform and cloud approvers inspect raw evidence and sign the same immutable candidate manifest.

**Signature table:** remain intentionally unsigned until all criteria are evidenced. A successful code CI run is not a substitute for the failed physical AWS gate or missing provider/entrypoint evidence.
