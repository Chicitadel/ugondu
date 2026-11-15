# UIAO — Ugondu Identity & Access Orchestration

## Overview
**UIAO** is an independent Ugondu subsystem responsible for answering:
> "Given these credentials, this target platform, this intended operation, and this customer's authorization policy, establish the safest durable authentication path available, validate it, use it, maintain it, and recover from authentication failure."

It enforces the Ugondu promise: **Persistent trust, ephemeral credentials.**

## Architectural Guarantees
- **Credential Agnostic:** Accepts whatever authorized authentication method the provider supports.
- **Context Aware:** Chooses authentication based on operation, target, risk, and available credentials.
- **Federation First:** Prefers persistent trust (e.g., OIDC) + ephemeral credentials (STS).
- **Bootstrap Authority Contract:** Bootstrapping operates under explicitly bounded authority. Ugondu discovers its current authority and explicitly identifies any Authority Gap rather than silently failing or circumventing restrictions.
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

| UIAO Capability | Community | Professional | Business | Sovereign |
| :--- | :---: | :---: | :---: | :---: |
| Credential onboarding | ✓ | ✓ | ✓ | ✓ |
| Identity discovery | ✓ | ✓ | ✓ | ✓ |
| Permission preflight | ✓ | ✓ | ✓ | ✓ |
| **Authority-gap explanation** | ✓ | ✓ | ✓ | ✓ |
| Safe manual remediation instructions | ✓ | ✓ | ✓ | ✓ |
| Basic authentication | ✓ | ✓ | ✓ | ✓ |
| Autonomous credential selection | — | ✓ | ✓ | ✓ |
| Autonomous federation discovery | — | ✓ | ✓ | ✓ |
| Autonomous OIDC establishment | — | ✓ | ✓ | ✓ |
| **Autonomous trust repair** | — | ✓ | ✓ | ✓ |
| Multi-platform federation | — | — | ✓ | ✓ |
| Organization-wide identity governance | — | — | ✓ | ✓ |
| Autonomous identity lifecycle | — | — | ✓ | ✓ |
| Sovereign trust domains | — | — | — | ✓ |
| Air-gapped identity orchestration | — | — | — | ✓ |

## Plugin ABI / Specification (Contract)

Every UIAO provider plugin implements the `IdentityProviderPlugin` interface:

```typescript
export interface IdentityProviderPlugin {
    // Identity & Discovery
    discoverAuthentication(): Promise<DiscoveredCredentials[]>;
    identifyPrincipal(credential: CredentialReference): Promise<PrincipalIdentity>;
    discoverAuthority(principal: PrincipalIdentity): Promise<PrincipalAuthority>;
    
    // Preflight & Planning
    calculateRequiredAuthority(operation: OperationPlan): Promise<PrincipalAuthority>;
    calculateAuthorityGap(current: PrincipalAuthority, required: PrincipalAuthority): Promise<AuthorityGap>;
    planBootstrap(gap: AuthorityGap): Promise<BootstrapPlan>;
    requestApprovalIfRequired(plan: BootstrapPlan): Promise<boolean>;
    
    // Core Auth Operations
    authenticate(target: TargetConfig, context: AuthContext): Promise<SessionCredentials>;
    authorize(principal: PrincipalIdentity, operation: OperationPlan): Promise<AuthorizationResult>;
    
    // Trust & Federation
    federationOptions(principal: PrincipalIdentity): Promise<FederationPath[]>;
    establishTrust(path: FederationPath): Promise<TrustRelationship>;
    verifyTrust(trust: TrustRelationship): Promise<boolean>;
    issueEphemeralCredentials(trust: TrustRelationship): Promise<EphemeralCredentials>;
    
    // Lifecycle
    refresh(session: SessionCredentials): Promise<SessionCredentials>;
    rotate(credential: CredentialReference): Promise<CredentialReference>;
    revoke(credential: CredentialReference): Promise<void>;
    recover(transactionId: string): Promise<void>;
    
    disconnect(): Promise<void>;
    audit(session: SessionCredentials): Promise<IdentityEvidence>;
}
```

The Central Policy Engine governs all plugin calls. UIAO safely stops on `AccessDenied`, transforming it into an explicit `AUTHORITY_GAP` with exact remediation steps.
