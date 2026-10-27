# Ugondu Re-audit Handover — DirectAdmin Staging Safety

**Finding ID:** UG-DIRECTADMIN-STAGING-PATH-001  
**Branch:** `fix/directadmin-staging-path-containment-2026-10-27`  
**Parent candidate:** `326a7f75272ecbcfabc60cc19ba3b9c3c182a15e`  
**Scope:** DirectAdmin staging script path safety and truthful qualification status  
**Release posture:** Implementation candidate; live host remains unqualified.

## Confirmed defects

1. `tools/deploy-directadmin-staging.ps1` accepted a caller-supplied target and joined it to the staging root without validating DNS-name syntax or proving the resolved directory stayed inside the approved staging root. A traversal-like target or symlinked directory could redirect writes outside the intended staging folder.
2. The staging script emitted `STAGING_READY` in `health.json`, while the repository fixture also carried that status. The script only staged a local artifact; it did not upload, deploy, probe or qualify the real DirectAdmin host. This status could be mistaken for physical readiness.

## Physical code changes

- Validate each DNS label and total DNS name length before path resolution.
- Require the target staging directory to exist and resolve to a direct child of the canonical `deploy/directadmin` root.
- Reject resolved-path escapes, non-directory targets and a missing/non-file `.htaccess`; verify that `.htaccess` resolves inside the target directory.
- Change the generated health artifact to `ARTIFACT_STAGED_NOT_HOST_QUALIFIED`, with `host_qualification: NOT_RUN` and `evidence_scope: artifact-only`.
- Change the committed staging fixture so it no longer claims host qualification or carries a stale generated timestamp/domain as if it were live evidence.
- Add a dependency-free PowerShell regression script and a Windows GitHub Actions workflow.

## Regression evidence

Test file: `tools/tests/Test-DeployDirectAdminStaging.ps1`

- Positive case: valid DNS target stages artifact and preserves truthful evidence scope.
- Negative case: traversal-like target is rejected and creates no outside target.
- Negative case: malformed DNS label is rejected.
- CI workflow: `.github/workflows/directadmin-staging-safety.yml`, Windows runner, PowerShell Core.

**Acceptance is pending until the new workflow runs successfully on the exact branch head.** This handover does not claim that the PowerShell tests have already run.

## Guardrails for Antigravity agents/actors

- Continue from this branch; do not recreate the same fix on a parallel branch.
- Do not modify `master` or `phase4/production-hardening` directly.
- Do not treat artifact staging, a generated `health.json`, a directory's existence, or a successful upload as proof of application health.
- Live-host qualification must be a separate authorized, non-destructive workflow with HTTP status/header/content-hash read-back and redacted evidence.
- Preserve the central Air Roofers legal policy source at https://policies.airroofers.eu.
- Keep AeroBill/Mandatag as the billing and entitlement authority.
- Any change to these files must rerun the dedicated Windows workflow plus the repository CI/COR gates on the exact new SHA.

## Still open for universal COR

- Authorized AWS bootstrap apply/read-back receipts.
- GCP and Azure physical qualification, or remove those providers from supported claims.
- AI model fleet qualification; unqualified/offline catalog entries must remain disabled.
- Actual DirectAdmin host qualification.
- Immutable signed artifact install, upgrade, rollback, recovery, uninstall and orphan-scan evidence.
- Independent UAIGOS review and release authority sign-off.

**Disposition:** Targeted defect implemented in code with regression tests added; workflow evidence pending. Universal COR and public commercial release remain **NOT CERTIFIED**.


## Additional confirmed finding — UG-DIRECTADMIN-RESOURCE-LIFECYCLE-002

A wider pass through the same provider found that database create/delete commands returned success without provider read-back or ownership proof, storage deletion used `rm -rf` based only on a syntactically valid name, and the provider contract advertised hosted-app/database lifecycle capabilities that the adapter could not qualify.

### Physical code changes
- Database creation/deletion now fail closed until a provider-native verified lifecycle and ownership/read-back protocol exists; the code no longer reports unverified database creation as running.
- Storage deletion no longer runs `rm -rf` without durable ownership/provenance evidence.
- Private storage creation now uses a non-idempotent `mkdir` for the target (pre-existing targets are not silently adopted) and checks the resulting directory is present and writable before returning success.
- The DirectAdmin provider capability contract no longer advertises hosted-app deployment or database lifecycle as supported; rollback/delete claims are removed. Private file storage remains conditional because its full lifecycle is not yet qualified.
- Regression tests assert that unqualified database create/delete and storage deletion fail closed without reaching a live host.

### Acceptance
The engine-core workspace tests and integrated CI/COR must pass on the exact final head. This is a conservative safety closure, not a claim that DirectAdmin database provisioning/deletion or application deployment is now implemented. Such capabilities remain unavailable until the native API, ownership ledger, read-back, rollback and physical smoke tests are implemented.
