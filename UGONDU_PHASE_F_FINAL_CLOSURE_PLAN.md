# UGONDU PHASE F FINAL CLOSURE PLAN

## OVERVIEW
This master checklist tracks the absolute final source code remediation required to lift the certification blockers. We are executing a single, controlled closure of four focused workstreams before permanently freezing the candidate for the physical AWS campaign.

## WORKSTREAM A: Physical AWS Production Path
- [ ] Replace `ami-placeholder` with dynamic SSM resolution (`resolveCertificationAmi`).
- [ ] Ensure canonical Action Registry uses production handlers (no fake `urre.registerHandler` in certification).
- [ ] Implement actual Waiters (`waitUntilInstanceRunning`, `DescribeVpcs`, etc.).
- [ ] Implement actual termination paths (no `return { success: true }` no-ops).
- [ ] Execute real S3 bucket/object, RDS, EBS, and Snapshot lifecycles.

## WORKSTREAM B: COR Evidence
- [ ] Redefine `ProviderObservation` to mandate `provider response + verification response + resource identity + context`.
- [ ] Reject `PROVEN` status if actual provider/verification evidence is absent.
- [ ] Modify certification scripts to harvest actual AWS SDK responses/verification describing states into the EvidenceCollector.

## WORKSTREAM C: Fargate COR-7
- [ ] Implement real ECR authentication and physical image push.
- [ ] Extract real SHA-256 digest from ECR push.
- [ ] Ensure Task Definition references `[ACCOUNT].dkr.ecr.[REGION].amazonaws.com/repo@sha256:digest` (no `public.ecr.aws`).
- [ ] Use actual VPC subnets (no `subnet-placeholder`).
- [ ] Execute actual Fargate service deployment, replacement, and physical rollback via URRE.
- [ ] Remove simulated `mock-tx`, simulated failure timeouts, and simulated `catch -> RECOVERED`.

## WORKSTREAM D: DEISE
- [ ] Refactor `IAwsClient` contract to include strongly typed methods: `setEc2Tags`, `modifyRdsInstance`.
- [ ] Remove direct `(this.awsClient as any).ec2` SDK escape hatches.
- [ ] Implement real physical RDS repair operation in `AwsPhysicalRepairExecutor`.
- [ ] Ensure every DEISE repair generates diagnosis, authorization, mutation, provider response, verification, and evidence.

## WORKSTREAM E: Strict Candidate Gate
- [ ] Update `verify-cor-candidate.ps1` to semantically block: `ami-placeholder`, `subnet-placeholder`, `mock-tx`, `mocking`, `simulation`, `fake`, `stub`, `skip physical`, `public.ecr.aws`.
- [ ] Add JSON Candidate Manifest generation to `.ps1` (hashed).

## WORKSTREAM F: Global Compliance & Localization (Per System Prompt)
- [ ] Eradicate remaining stubs, mocks, and deprecated scaffolding globally.
- [ ] Translate all strings into existing locales, eliminate hardcoding.
- [ ] Ensure microservices capability isolation.

**Guardrail:** No source modifications will occur once the candidate is frozen and verified. Physical Certification will only execute against the frozen SHA.
