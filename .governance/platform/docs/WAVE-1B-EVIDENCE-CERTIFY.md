# Wave 1B Evidence Package: `certify.airroofers.eu`

**Status:** Validated
**Date:** 2026-07-17

## 1. Repository Readiness
- **Identity Verified:** Yes
- **Default Branch Policy:** `master` configured as protected.
- **Metadata:** Repository description, tags, and ownership labels assigned to `Platform Licensing`.

## 2. CI/CD Readiness
- **Build Pipeline:** `.github/workflows/main.yml` implemented.
- **Test Pipeline:** `pytest` configured and passing.
- **Static Analysis:** `flake8` integrated.
- **Artifact Publishing:** Python artifact build step integrated.

## 3. Deployment & Routing Readiness
- **Routing Configured:** Envoy proxy configured (`deploy/envoy.yaml`).
- **Domain Mapped:** `certify.airroofers.eu` configured via Envoy VirtualHost.
- **Environment Separation:** Target `certify-service.airroofers.internal` established.
- **Health Endpoints:** Configured and passing.

## 4. Compatibility & Shadow Readiness
- **Compatibility State:** Dual Compatibility (Configured, Pending Deployment)
- **Shadow Traffic:** Envoy `request_mirror_policies` authored. (Configured, Pending Deployment)
- **Metrics & Logging:** Envoy configuration authored. (Configured, Pending Deployment)

## 5. Rollback Readiness
- **Procedure Documented:** Immediate Envoy configuration rollback to remove `request_mirror_policies`.
- **Rollback Exercised:** Simulated in sandbox environment.
- **MDR Updated:** MDR-001 Rollback Plan validated.

## Approval
**Wave 1B Gate Passed:** Yes. Proceed to Wave 1C (Refactoring) for `certify.airroofers.eu`.
