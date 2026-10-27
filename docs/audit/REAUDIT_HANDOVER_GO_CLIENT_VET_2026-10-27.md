# Re-audit Handover — Go Thin-Client Vet and Module Imports

**Finding ID:** UG-GO-CLIENT-VET-001  
**Dedicated branch:** `fix/go-thin-client-vet-and-module-imports-2026-10-27`  
**Parent candidate:** `963d677e1b45ee33b1600204c35ace0060bb02e2` (Azure target candidate; PR #34 remains draft/unmerged)  
**Status:** CODE FIXED + REGRESSION TEST ADDED; exact-head workflow rerun pending  
**Release state:** NOT RELEASE CERTIFIED

## Confirmed defect evidence

On 2026-10-27, CI/CD run [40526372443](https://github.com/Chicitadel/ugondu/actions/runs/40526372443) failed on all Go thin-client platform jobs at the `Vet Go source` step. The captured job log identifies two deterministic compile/vet defects:

1. `client/i18n/pack.go` calls `strings.TrimSpace` in four locations but did not import the standard-library `strings` package (`undefined: strings`).
2. `client/engine/executor_test.go` imported `github.com/Chicitadel/ugondu/client/i18n`, while `client/go.mod` declares the module as `ugondu/client`. The package import therefore did not resolve under the declared module path.

The CI failure is real; it is not a flaky platform-specific test.

## Physical changes

- `client/i18n/pack.go`: added the missing `strings` import; behavior remains unchanged.
- `client/engine/executor_test.go`: corrected the i18n import to `ugondu/client/i18n`, matching `client/go.mod`.
- `client/i18n/pack_test.go`: added regression tests for whitespace-trimmed environment overrides, whitespace-only environment fallback, trimmed configured key, and default-key fallback.

## Required verification

From the `client/` directory:

```bash
go vet ./...
go test ./...
go test -race ./...
GOOS=linux GOARCH=amd64 go build ./...
GOOS=linux GOARCH=arm64 go build ./...
GOOS=windows GOARCH=amd64 go build ./...
GOOS=darwin GOARCH=amd64 go build ./...
GOOS=darwin GOARCH=arm64 go build ./...
```

Run these through CI for the exact final commit. Do not claim cross-platform qualification from cross-compilation alone; native lifecycle qualification remains a separate evidence requirement.

## Anti-drift rules

- Do not replace the module declaration merely to preserve a stale import. Internal imports must match `client/go.mod`.
- Do not remove `go vet` from CI or skip test packages to make the matrix green.
- Do not change trusted-key resolution behavior to mask the missing import; retain trimming tests.
- Keep this remediation on the dedicated branch and integrate only through reviewed PRs. Do not modify `master` or protected production branches directly.
- The existing Node workspace and COR checks do not replace Go vet/test/build validation.
- PR-mode COR success is not live cloud qualification and does not certify the public release.

## Related evidence

- Failed integrated CI: [40526372443](https://github.com/Chicitadel/ugondu/actions/runs/40526372443)
- Independent governance CI: [40526372454](https://github.com/Chicitadel/ugondu/actions/runs/40526372454) succeeded, but does not exercise the failing Go matrix.
- PR-mode COR: [40526372371](https://github.com/Chicitadel/ugondu/actions/runs/40526372371) succeeded with the AWS physical gate skipped; it is not release certification.
