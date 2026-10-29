# COR Finding Handover — UG-COR-ECS-CONTAINER-NAME-MISMATCH-001

- **Status:** IMPLEMENTED — EXACT-HEAD VALIDATION PENDING
- **Branch:** `fix/cor-ecs-container-name-resolution-2026-10-29`
- **Base candidate:** `8f9d77e35aff659c9ef48c6afaace0e138e2dea0` (Ugondu PR #54)
- **Authority:** UAIGOS v3.0.0; `AR-CLOUD-PORTABILITY-001`
- **Release posture:** `PARTIAL / RELEASE BLOCKED / NOT CERTIFIED`

## Finding and root cause

The ECS rollout-readiness implementation inferred an ECS load-balancer's `containerName` from the task-definition family. These are separate fields: a task definition may use family `api-container-family` while its actual `containerDefinitions[0].name` is `backend-api-container`. Sending the inferred family as container name can cause ECS service creation or target registration to fail.

## Physical remediation committed

- Added `DescribeTaskDefinitionCommand` usage to resolve the actual registered container name from ECS.
- Validates the task-definition ARN before querying ECS.
- Fails closed with `ECS_TASK_DEFINITION_CONTAINER_NAME_MISSING` when the registered task definition has no resolvable container name.
- Applies this lookup only when a target group is configured; no unrelated runtime path is changed.
- Added regression tests using a family/container-name mismatch and missing container definitions.

## Changed files

- `server/engine-core/src/fabric/providers/aws-native-client.ts`
- `server/engine-core/src/fabric/tests/aws-native-client-no-synthetic-success.spec.ts`

## Verification protocol

1. Run the focused `@airroofers/ugondu-engine-core` Jest suite, including `aws-native-client-no-synthetic-success.spec.ts`.
2. Run workspace build/typecheck and the repository CI + COR workflows against the exact final PR head.
3. Confirm the test proves a different container name is used and the missing-name case rejects before `CreateService`.
4. Obtain independent code/security review.
5. Keep AWS physical qualification pending until explicitly budget-authorized staging execution provides service health, readiness, rollback, logs and cleanup receipts.
6. Keep AeroBill and Mandatag non-production transaction receipts open until actual federated calls are completed.

Mocked SDK tests do not establish live AWS behavior. No AWS resource creation is authorized or claimed by this remediation. Do not merge or promote without human authorization.
