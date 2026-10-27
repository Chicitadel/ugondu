# Re-audit Handover — Go Thin-Client Vet Failure

**Finding:** UG-GO-CLIENT-VET-001  
**Branch:** `fix/go-thin-client-vet-mainline-2026-10-27`  
**Base:** `2c22cfa82e5214617940dac95162ac12a3c51ac1`  
**Status:** Code remediation and regression tests committed; exact-head CI pending.  
**Release status:** NOT RELEASE CERTIFIED.

## Confirmed defect

Integrated CI run [40526372443](https://github.com/Chicitadel/ugondu/actions/runs/40526372443) failed `go vet ./...` for all Go thin-client platform jobs. Its logs report:
- `client/i18n/pack.go`: four `undefined: strings` errors because `strings.TrimSpace` was used without importing the standard-library package.
- `client/engine/executor_test.go`: unresolved import `github.com/Chicitadel/ugondu/client/i18n`, inconsistent with `client/go.mod` declaring `module ugondu/client`.

## Physical remediation

- Added `strings` import to `client/i18n/pack.go`.
- Changed test import to `ugondu/client/i18n`, matching the declared module.
- Added regression tests for trimmed environment override, whitespace-only environment fallback to a configured key, and default-key fallback.
- This PR is isolated from PR #34 so CI can run against the repository's `main` pull-request trigger without modifying the Azure branch or production branches.

## Required evidence

The exact-head workflow must pass:
```bash
cd client
go vet ./...
go test ./...
go test -race ./...
GOOS=linux GOARCH=amd64 go build ./...
GOOS=linux GOARCH=arm64 go build ./...
GOOS=windows GOARCH=amd64 go build ./...
GOOS=darwin GOARCH=amd64 go build ./...
GOOS=darwin GOARCH=arm64 go build ./...
```

Do not remove Go vet, omit the failing package, or rename the module to work around the import defect. Cross-compilation does not establish native lifecycle qualification. This finding remains open until exact-head CI confirms the fix.
