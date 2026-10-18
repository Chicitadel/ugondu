<!--
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPLM Phase 0 Component Mapping
 * File           : UPLM_COMPONENT_MAPPING.md
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS 5.0
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/
-->

# UPLM Phase 0 — Component Mapping Specification

## 1. Purpose

This document maps every Universal Plugin Lifecycle Management (**UPLM**) subsystem to concrete source modules, runtime registries, durable state machines (`URRE`/`DEISE`), CLI/UI surfaces, and AWS IAM execution policies inside the Ugondu platform.

---

## 2. End-to-End Component Mapping Matrix

| UPLM Architectural Concern | Primary Service / Module | Concrete Repository Path(s) | Runtime Interface / Contract | Verification Gate |
|---|---|---|---|---|
| **Plugin Manifest & Schema v2** | `plugin-manager`, `shared` | `server/plugin-manager/src/`, `server/shared/packs.ts` | `PluginManifestV2` (`name`, `version`, `entrypoint`, `permissions[]`, `publisher`, `signature`) | `tests/plugin-manager.test.js` |
| **Cryptographic Trust Root** | `shared`, `plugin-manager` | `server/shared/trust_registry.ts`, `config/trust/plugin_authority.pub.pem`, `client/engine/trust_registry.go` | Ed25519 signature verification over canonical manifest JSON | `scripts/ci/verify-trust-root.js` |
| **Plugin Quota & Edition Gate** | `billing-gateway`, `uppie` | `server/billing-gateway/src/`, `.governance/policies/capabilities-matrix.yaml` | `COMMUNITY` (1), `PROFESSIONAL` (5), `BUSINESS` (25), `ENTERPRISE` (Unlimited), `SOVEREIGN` (Unlimited) | `tests/billing-gateway.test.js` |
| **Sandbox Container Executor** | `plugin-manager` | `server/plugin-manager/src/` | `--rm --init --read-only --network=none --cap-drop=ALL --security-opt=seccomp=default --pids-limit=64` | `tests/plugin-manager.test.js` |
| **Capability Registry** | `capabilities`, `shared` | `server/capabilities/src/`, `server/shared/capability-model.ts` | `CapabilityKind` (12 kinds), `CapabilityAction`, `ProviderCapabilityDeclaration`, `CapabilityGraph` | `tests/roadmap-r2-r3-upm-compiler.test.js` |
| **Policy & Admission Gate (UPPIE)** | `uppie`, `engine-core` | `server/uppie/src/`, `server/engine-core/src/` | `ArchitectureIR` -> `ExecutionAuthorization` (HMAC-SHA256 / Ed25519 seal) | `tests/passport-admission-gate.test.js` |
| **Durable State Machine (URRE)** | `engine-core`, `shared`, `client` | `server/shared/urre-journal.ts`, `server/shared/urre-preflight.ts`, `server/shared/urre-recovery.ts`, `client/engine/state.go` | `TransactionState`, `ExecutionFaultInjector`, topological rollback DAG | `tests/urre-restart.test.js`, `tests/urre-30class-failure.test.js` |
| **Environment Twin & Drift (DEISE)** | `engine-core`, `shared`, `plugins` | `server/shared/environment-twin.ts`, `server/plugins/recovery-*` | `EnvironmentTwin`, `InfrastructureDriftDiagnostic`, `AwsPhysicalRepairExecutor` | `tests/twin-state-machine.test.js`, `tests/doctor-remediation.test.js` |
| **Repository Provider Registry** | `repository-adapter` | `server/repository-adapter/src/index.ts` | `RepositoryProvider` (9 providers), `POST /v1/repository/resolve`, `GET /v1/repository/providers` | `tests/repository-adapter.test.js` |
| **Thin Client CLI Surface** | `client` | `client/cmd/cli.go`, `client/cmd/repair.go`, `client/cmd/locale_cmd.go`, `client/engine/executor.go` | `ugondu deploy`, `resume`, `status`, `rollback`, `repair`, `plugins`, `locale`, `auth` | `client/engine/executor_test.go` |
| **12-Locale Language Pack Engine** | `client/i18n`, `server/shared` | `client/i18n/pack.go`, `client/locales/*.json`, `locales/*.json`, `server/shared/i18n.ts` | Signed drop-in locale bundles (`ar`, `de`, `en`, `es`, `fr`, `hi`, `it`, `ja`, `ko`, `pt`, `ru`, `zh`) | `tests/language-packs.test.js`, `client/i18n/pack_test.go` |

---

## 3. UPLM Plugin Lifecycle State Mapping

```text
[DISCOVERED] ──(Ed25519 + Schema v2 Check)──► [VERIFIED]
     │                                            │
     │ (Signature/Schema Reject)                  ▼ (Edition Quota + UPPIE Gate)
     ▼                                       [INSTALLED]
[QUARANTINED]                                     │
                                                  ▼ (Activation & Capability Bind)
                                             [ACTIVATED]
                                                  │
                       ┌──────────────────────────┴──────────────────────────┐
                       ▼ (URRE Step Dispatch)                                ▼ (Operator / Policy Pause)
                  [EXECUTING]                                           [SUSPENDED]
                       │                                                     │
          ┌────────────┴────────────┐                                        │
          ▼ (Step Pass)             ▼ (Step Fault / Drift Trigger)           │
     [COMPLETED]              [ROLLED_BACK] ◄────────────────────────────────┘
                                    │
                                    ▼ (Deprovision)
                              [UNINSTALLED]
```

---

## 4. AWS COR V9 Split Managed Policy Component Mapping

To stay within the AWS IAM 6,144-character managed policy size ceiling while enforcing strict transaction-scoped ABAC conditions (`aws:RequestTag/UgonduCOR = "true"` and `aws:RequestTag/UgonduTransactionId = "${aws:PrincipalTag/UgonduTransactionId}"`), `Ugondu_CORExecutionRole_Policy_V9.json` maps onto **5 split managed policies** attached to `arn:aws:iam::971671216490:role/UgonduCORExecutionRole` in region `eu-west-3`:

| Split Policy Index | Managed Policy Name | Covered AWS Services & SIDs | Mapped Ugondu Adapter / Component |
|---:|---|---|---|
| **1** | `UgonduCOR_V9_Part1_NetworkAndVPC` | `AllowRegionIndependentSSM`, `CreateTaggedVpc`, `CreateTaggedSubnet`, `CreateTaggedInternetGateway`, `CreateTaggedRouteTable`, `CreateTaggedSecurityGroup`, `EnforceDeleteVpc`, `EnforceDeleteSubnet`, `EnforceDeleteInternetGateway`, `EnforceDeleteRouteTable`, `EnforceDeleteSecurityGroup`, `AllowAttachDetachGateway`, `AllowRouteTableAssoc`, `AllowRouteOps` | `server/plugins/aws-vpc-adapter`, `scripts/cor/aws-vpc-orphan-handler.ts` |
| **2** | `UgonduCOR_V9_Part2_ComputeAndSnapshots` | `CreateTaggedSnapshot`, `LaunchTaggedInstanceTags`, `LaunchTaggedInstanceReadOnly`, `AllowTaggingDuringCreation`, `DenyRemovalOfUgonduOwnershipTags`, `EnforceTerminateInstances`, `EnforceDeleteNetworkInterface`, `EnforceDeleteSnapshot` | `server/engine-core/physical-certification.ts`, `AwsPhysicalRepairExecutor` |
| **3** | `UgonduCOR_V9_Part3_RDSAndStorage` | `AllowRDSTaggingDuringCreation`, `CreateTransactionTaggedDBInstance`, `CreateTransactionTaggedDBSnapshot`, `CreateTransactionTaggedDBSubnetGroup`, `EnforceDBInstanceDestructiveBounds`, `EnforceDBSnapshotDestructiveBounds`, `EnforceDBSubnetGroupDestructiveBounds`, `EnforceS3BucketCreation`, `EnforceS3BucketTagging`, `EnforceS3BucketOperations`, `EnforceS3ObjectOperations` | `server/plugins/recovery-database`, `server/engine-core/physical-certification.ts` |
| **4** | `UgonduCOR_V9_Part4_ContainersAndFargate` | `AllowECRTaggingDuringCreation`, `AllowECSTaggingDuringCreation`, `CreateECROperations`, `EnforceECROperations`, `CreateECSTaskDefinition`, `CreateECSCluster`, `CreateECSService`, `DeregisterECSTaskDefinition`, `DeleteECSCluster`, `ModifyECSService`, `DenyECSTagStripping`, `AllowPassRoleForECS` | `server/engine-core/physical-fargate-certification.ts` |
| **5** | `UgonduCOR_V9_Part5_ReadDiscoveryAndTelemetry` | `AllowGlobalReadDiscovery` (`ec2:Describe*`, `rds:Describe*`, `rds:ListTagsForResource`, `ecr:DescribeRepositories`, `ecr:GetAuthorizationToken`, `ecr:ListTagsForResource`, `ecs:Describe*`, `ecs:ListTagsForResource`) | `DEISE` `EnvironmentTwin` Discovery, `EvidenceCollector`, `ZeroResiduals` Auditor |
