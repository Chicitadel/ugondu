# DASHBOARD AUDIT CHECKLIST

**Governance Status:** FROZEN
**Version:** 1.0.0
**Classification:** Enterprise Standard

Before any new widget, page, or feature is accepted into the Air Roofers Dashboard, it MUST pass the following UI Consistency Audit. Failure on any question blocks integration.

## Mandatory Audit Checks
- [ ] Does this widget belong exclusively to an existing platform capability?
- [ ] Is there already an authoritative backend service responsible for this data?
- [ ] Does this feature strictly read through the Composition API rather than querying data stores or raw logs directly?
- [ ] Does this UI change preserve the **Read-Oriented Principle** (mutation only allowed through explicit, audited boundaries)?
- [ ] Does this widget avoid duplicating any existing business logic?
- [ ] Does this change require an ADR because it modifies a frozen baseline?
- [ ] Does this feature avoid introducing a new dependency that violates the acyclic platform hierarchy?

*This checklist prevents domain drift, ensuring the UI remains an exact reflection of the operational architecture.*
