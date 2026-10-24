# UGONDU MASTER IMPLEMENTATION PLAN

## Executive Summary
Ugondu requires a rigorous progression from its current state (architecturally sound but physically incomplete) to a distribution-ready, world-class deployment OS. This plan dictates the strict remediation of the P0/P1 gaps discovered during the COR Forensic Audit.

---

## Phase 0: Evidence Freeze (Immediate)
**Objective:** Secure the local working tree.
- [ ] Task 0.1: Stage and commit all 152 modified files to Git.
- [ ] Task 0.2: Push the state to the remote repository (`Chicitadel/ugondu`).
- [ ] Task 0.3: Backup `~/.ugondu/` local state.

## Phase 1: Critical Remediation
**Objective:** Resolve compilation and structural blockers.
- [ ] Task 1.1: Install/Verify the Go toolchain on the build runner.
- [ ] Task 1.2: Resolve `tsc` mock typing errors inside `adapters.spec.ts`.
- [ ] Task 1.3: Clean `package.json` and `go.mod` dependencies.

## Phase 2: Provider Fabric Fulfillment
**Objective:** Replace `NotImplemented` barriers with actual SDK executions.
- [✓] Task 2.1: Implement SSH/API execution layers for `directadmin.ts`.
- [ ] Task 2.2: Implement `AWS-SDK-v3` bindings inside `aws.ts` for EC2 and RDS.
- [ ] Task 2.3: Establish E2E credential injection boundaries for physical host interaction.

## Phase 3: AI / Intent & DEISE Execution
**Objective:** Connect DEISE diagnosis to physical repair actions.
- [ ] Task 3.1: Implement `ln -s` and `rm` execution commands inside the DEISE repair executor.
- [ ] Task 3.2: Map NLP user prompts to the `DecomposedIntent` schema via an LLM gate.

## Phase 4: Memory & Credential Vault
**Objective:** Secure runtime memory.
- [ ] Task 4.1: Finalize AES-256-GCM vault encryption for `~/.ugondu/auth.json`.
- [ ] Task 4.2: Audit memory dumps to ensure no AWS keys leak in `Logger.info`.

## Phase 5: Edition & Plugin Subsystems
**Objective:** Enforce commercial boundaries.
- [ ] Task 5.1: Bind `CapabilityEnvelope.allowedActions` to the CLI local command router.
- [ ] Task 5.2: Ensure expired subscriptions gracefully block destructive operations.

## Phase 6: Security & Isolation
**Objective:** Ensure multi-tenant execution safety.
- [ ] Task 6.1: Audit path traversal vulnerabilities in URRE state loading.
- [ ] Task 6.2: Finalize the cryptographic hashing of `ArchitectureIR` into the Delivery Passport.

## Phase 7: Testing & Coverage
**Objective:** Ensure 100% reproducibility.
- [ ] Task 7.1: Re-run the full 140/140 Jest suite inside an isolated Docker container.
- [ ] Task 7.2: Run Go mutation testing against `client/engine/auth.go`.

## Phase 8: Distribution & Packaging
**Objective:** Generate the actual artifacts.
- [ ] Task 8.1: Implement `Dockerfile.cli` and `Dockerfile.server`.
- [ ] Task 8.2: Create `.goreleaser.yml` for Windows, Mac, and Linux matrices.
- [ ] Task 8.3: Configure `syft` SBOM generation inside the release pipeline.

## Phase 9: Cryptographic Release
**Objective:** Sign the artifacts.
- [ ] Task 9.1: Implement `cosign` keyless signing in GitHub Actions.
- [ ] Task 9.2: Publish the verified binaries to the Homebrew tap.

## Phase 10: Final COR Audit
**Objective:** Issue the Certificate of Readiness.
- [ ] Task 10.1: Run the Final COR Forensic Audit across all 31 gates.
- [ ] Task 10.2: Achieve `CERTIFIED` status.
