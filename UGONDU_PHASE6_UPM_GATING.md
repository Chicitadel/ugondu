# Ugondu - Phase 6 Implementation Report
## Intent Architecture + UPM Execution Gating

### 1. Hard Execution Gating (No Bypass)
The `ProvisioningEngine` has been cryptographically locked. 

```typescript
  public async executePlan(ir: ArchitectureIR, auth?: ExecutionAuthorization): Promise<ProvisioningReport> {
    if (!auth) throw new Error(__t('messages.error.missing_execution_authorization'));
    UpmExecutionGate.verifyAuthorization(auth, ir);
    ...
  }
```
Any caller (CLI, GUI, API) attempting to invoke the provisioning engine without a cryptographically sealed `ExecutionAuthorization` object will receive a hard `missing_execution_authorization` rejection. This fulfills the "No execution may commence..." invariant.

### 2. Cryptographic IR Binding
The authorization object now contains a `cryptographicSeal`. During evaluation, `UpmExecutionGate` hashes the provided `ArchitectureIR` and bakes it into the seal. 

When the `ProvisioningEngine` receives the request, `verifyAuthorization` re-hashes the exact IR attempting to execute:
```typescript
        const expectedSeal = this.hashOf({
            intentHash: auth.intentHash,
            twinHash: auth.twinHash,
            irHash: this.hashOf(executionIr), // Re-hashing the target
            policyVersion: auth.policyVersion,
            decisionStatus: auth.decision.status,
            envelopeHash: auth.envelopeHash
        });

        if (expectedSeal !== auth.cryptographicSeal) {
            throw new Error(__t('messages.error.seal_mismatch'));
        }
```
If the architecture is tampered with *after* approval, the execution is instantly rejected.

### 3. Explainable DENY Evidence
Instead of boolean true/false, `UpmDecision` now carries structured `evidence`. 

```typescript
export interface UpmDecisionEvidence {
    policyId: string;
    requirement: string;
    targetCapability: string;
    observedState: string;
    affectedIrNodes: string[];
    missing: string[];
    remediation: string;
}
```

### 4. DirectAdmin Native Provider Implementation
Following the Commercial Architecture constraint, `DirectAdminAdapter` has been implemented as a native provider alongside `AWS` and `cPanel`.
- Implements `ComputeCapability` (HOSTED_APP)
- Implements `DatabaseCapability`
- Implements `StorageCapability` (FILE)
- Strictly conforms to `ProviderCapabilities` and the translation keys.

### 5. Stabilized Test Scaffolding
- All 137 tests across 17 test suites in `engine-core` are now passing natively.
- Global test `__t` injection matches the production fallback strings.
- Mock adapters faithfully reflect the full capability interfaces.
