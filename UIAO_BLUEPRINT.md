# UIAO — Ugondu Identity & Access Orchestration

## Overview
**UIAO** is an independent Ugondu subsystem responsible for answering:
> "Given these credentials, this target platform, this intended operation, and this customer's authorization policy, establish the safest durable authentication path available, validate it, use it, maintain it, and recover from authentication failure."

It enforces the Ugondu promise: **Persistent trust, ephemeral credentials.**

## Architectural Guarantees
- **Credential Agnostic:** Accepts whatever authorized authentication method the provider supports.
- **Context Aware:** Chooses authentication based on operation, target, risk, and available credentials.
- **Federation First:** Prefers persistent trust (e.g., OIDC) + ephemeral credentials (STS).
- **Bootstrap Capable:** Existing credentials (e.g., AWS Access Keys) can bootstrap stronger authentication (OIDC roles) where authorized, and are then discarded.
- **Provider Native:** Uses each platform's official APIs/protocols rather than circumventing them.
- **Zero Credential Leakage:** Secrets never enter source, Git, logs, evidence, or telemetry.
- **Least Privilege:** Requests only the permissions required for the execution plan.
- **Human Approval Aware:** Proceeds autonomously where authorized; stops cleanly where provider/customer approval is mandatory.
- **Self-Verifying:** Identity, authorization, and the resulting trust relationship are independently verified before execution.
- **Recoverable:** Authentication changes participate in the Universal Recovery Engine (URRE) where technically reversible.
- **Plugin Based:** Authentication providers evolve independently from the execution engine.
- **Never Pretends:** Unsupported federation remains explicitly `UNQUALIFIED`.
- **Audit Evidenced:** Every identity transition becomes part of the cryptographically sealed execution evidence.

## Edition Capability Matrix

| Capability | Community | Professional | Business / Enterprise | Sovereign |
| :--- | :---: | :---: | :---: | :---: |
| Basic credential registration & validation | ✓ | ✓ | ✓ | ✓ |
| Local credential detection (e.g., AWS CLI profile) | ✓ | ✓ | ✓ | ✓ |
| Permission preflight & Dry-run auth plan | ✓ | ✓ | ✓ | ✓ |
| Credential redaction in evidence | ✓ | ✓ | ✓ | ✓ |
| Multiple credential profiles & accounts | — | ✓ | ✓ | ✓ |
| Automatic credential selection & rotation | — | ✓ | ✓ | ✓ |
| Authentication recovery | — | ✓ | ✓ | ✓ |
| **Autonomous OIDC establishment / Federation discovery** | — | ✓ | ✓ | ✓ |
| Cross-platform trust establishment | — | — | ✓ | ✓ |
| Organization-wide policy & central governance | — | — | ✓ | ✓ |
| Approval workflows & Delegated administration | — | — | ✓ | ✓ |
| Sovereign identity policy engine | — | — | — | ✓ |
| Sovereign credential vault & Air-gapped identity | — | — | — | ✓ |

## Plugin ABI / Specification (Contract)

Every UIAO provider plugin (e.g., `identity-aws`, `identity-github`) implements the `IdentityProviderPlugin` interface:

```typescript
export interface IdentityProviderPlugin {
    discover(): Promise<DiscoveredCredentials[]>;
    identify(credential: CredentialReference): Promise<PrincipalIdentity>;
    capabilities(): Promise<ProviderAuthCapabilities>;
    
    authenticate(target: TargetConfig, context: AuthContext): Promise<SessionCredentials>;
    authorize(principal: PrincipalIdentity, operation: OperationPlan): Promise<AuthorizationResult>;
    
    federationOptions(principal: PrincipalIdentity): Promise<FederationPath[]>;
    bootstrap(credential: CredentialReference, targetPath: FederationPath): Promise<TrustRelationship>;
    establishTrust(path: FederationPath): Promise<TrustRelationship>;
    validateTrust(trust: TrustRelationship): Promise<boolean>;
    
    issueTemporaryCredentials(trust: TrustRelationship): Promise<EphemeralCredentials>;
    refresh(session: SessionCredentials): Promise<SessionCredentials>;
    rotate(credential: CredentialReference): Promise<CredentialReference>;
    revoke(credential: CredentialReference): Promise<void>;
    
    disconnect(): Promise<void>;
    audit(session: SessionCredentials): Promise<IdentityEvidence>;
}
```

The Central Policy Engine governs all plugin calls. Plugins do not self-execute state changes without URRE authorization.

## Credential Onboarding UX

### 1. Beginner (Guided Autonomy)
```bash
$ ugondu deploy ./my-app --target aws

IDENTITY PREFLIGHT
Source: GitHub (Repository: example/app)
Target: AWS (Account: 123456789012, Region: eu-west-3)

Authentication available:
 ✓ GitHub credential
 ✓ AWS bootstrap credential (local access key detected)

Recommended authentication:
 ✓ GitHub OIDC → AWS IAM Role
   Security: HIGH
   Credential lifetime: temporary
   Persistent secret storage: NONE

Required changes:
 1. Create/update IAM OIDC provider
 2. Create Ugondu execution role
 3. Restrict trust to repository/branch/environment
 4. Validate role assumption

Authorization:
 ✓ Current AWS bootstrap identity can perform required IAM operations

Proceed with autonomous trust establishment? [Y/n] y

TRUST ESTABLISHED
GitHub OIDC ↓ AWS IAM ↓ UgonduExecutionRole ↓ Temporary AWS credentials
Bootstrap AWS credential: No longer required.
Authentication status: ✓ VERIFIED

Proceeding with deployment...
```

### 2. Expert (Controlled Autonomy)
```bash
$ ugondu auth establish \
    --source github \
    --target aws \
    --federation oidc \
    --trust repo:chicitadel/ugondu \
    --branch main \
    --least-privilege \
    --verify \
    --noninteractive
```

## Immediate Application: AWS OIDC Physical COR Unblocking

The AWS OIDC mechanism will serve as the first reference implementation for the UIAO specification. 

Instead of requiring manual OIDC configuration out-of-band or failing due to missing AWS credentials, the immediate next step is to implement the `identity-aws` plugin that can consume the local `accessKey.csv` as a **Bootstrap Credential**. 

Ugondu will use this bootstrap credential to **autonomously establish the OIDC trust relationship** in the target AWS account, configure the GitHub Actions environment, verify temporary STS credential assumption, and immediately discard the bootstrap credential. 

This directly unblocks the Physical COR while delivering a massive Day-1 product capability.
