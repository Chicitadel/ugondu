# UGONDU PHASE F FINAL MASTER PLAN & COR REMEDIATION

## Strategic Directive
The candidate (SHA `234e9f874d5d205114f9056622a173a14858e92b`) was rejected due to inadequate evidence generation, non-production execution paths, non-deterministic crash testing, incomplete DEISE structure, insufficient Fargate lifecycle, and inadequate candidate gating. This plan outlines the final, controlled remediation phase to close these exact gaps before ANY physical AWS execution is authorized.

## Master Checklist

### Phase F.1: Evidence Engine (Subagent 1)
- [ ] Implement `ProviderResponseCanonicalizer` and `ProviderResponseHasher`.
- [ ] Implement `ObservedStateDeriver` and `ImmutableGateEvaluator`.
- [ ] Implement `EvidenceCollector`.
- [ ] Add adversarial tests (`fake hash -> NOT_PROVEN`, `timestamp hash -> NOT_PROVEN`, etc.).
- [ ] Guardrail: Prohibit direct assignment of `providerResponseHash` or `observedState` in certification scripts.

### Phase F.2: Production-Path Certification (Main Agent)
- [ ] Refactor `physical-certification.ts` to use `UniversalActionRegistry -> Governance -> URRE -> Provider Adapter` for all mutations.
- [ ] Direct AWS SDK usage is permitted ONLY for `OBSERVATION_ONLY`, `VERIFICATION_ONLY`, and `CLEANUP_ONLY`.
- [ ] Add static CI guard to prevent raw AWS mutation clients inside certification.

### Phase F.3: Genuine URRE Crash Recovery (Subagent 2)
- [ ] Introduce `ExecutionFaultInjector` interface: `afterNodePersisted?(node: DagNode): Promise<void>;`.
- [ ] Rewrite `urre-crash-resume.ts` to inject a fault immediately after VPC SUCCESS persistence.
- [ ] Ensure process termination is deterministic, not timer-based (`process.exit()` via injector).
- [ ] Ensure Process B skips VPC, finishes SUBNET, and verifies idempotency on a 3rd run.

### Phase F.4: DEISE Structured Repair (Subagent 3)
- [ ] Replace `diag.description.includes` with structured `InfrastructureDriftDiagnostic` (`resourceType`, `attribute`, `repairOperation`, etc.).
- [ ] Enforce `UGONDU_CERT_REGION` across all DEISE modules; fail closed if missing.
- [ ] `AwsPhysicalRepairExecutor` must use the injected `IAwsClient`, not a new `EC2Client`.

### Phase F.5: Fargate Certification (Main Agent)
- [ ] Implement full COR-7 lifecycle in `physical-fargate-certification.ts`.
- [ ] ECR repository creation -> Push immutable test image (mock push if local Docker absent but must simulate exact sequence) -> verify digest.
- [ ] Service deployment (Revision 1) -> Wait stable -> Terminate Task -> Verify ECS replacement -> Deploy Revision 2 -> Inject failure -> URRE Rollback to Revision 1 -> Residual scan & Cleanup.

### Phase F.6: Governance Canonicalization (Subagent 3)
- [ ] Implement Canonical JSON serializer for Policies (sort keys, arrays).
- [ ] Prove equivalent policies produce identical hashes, and differing policies produce different hashes.
- [ ] Remove wildcard resources (`*`) for concrete AWS operations in the Action Registry.

### Phase F.7: Candidate Gate (Main Agent)
- [ ] Update `verify-cor-candidate.ps1`: `npm run lint` MUST fail on exit code != 0.
- [ ] Remove permissive exclusions from placeholder/secrets grep.
- [ ] Include all required scans: clean tree, exact SHA, build, test, lint, diff-check, secrets, placeholders, NotImplemented, hardcoded credentials/AMIs/accounts, and adversarial tests.

## Execution Strategy
Massive subagents are being invoked to tackle F.1, F.3, F.4, and F.6 in parallel. The main coordination agent will enforce F.2, F.5, and F.7, followed by an integrated test suite verification. **No physical campaign will be executed.**
