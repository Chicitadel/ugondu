# Universal Air Roofers Cloud Architecture — Ugondu AWS Deployment Guide

**Product:** Ugondu — Universal Deployment Intelligence Platform  
**Target Environment:** AWS ECS on EC2 (Pilot/Staging) & ECS Fargate  
**Region:** `eu-west-3` (Paris, Primary EU Tier)  
**Author:** Ignatus Chika Ujomor (Lead Systems Architect) — Air Roofers SASU  
**Standards:** ISO 27001 / SOC 2 / OWASP ASVS v4 / NIST / Zero-Trust Architecture  
**Classification:** ENTERPRISE | RESTRICTED  

---

## 1. Overview & Architecture

Ugondu's AWS backend deployment follows the Air Roofers "One Code — Host Anywhere" portability standard. The backend service (`@ugondu/engine-core`) runs identically across:
- DirectAdmin Shared Hosting (Tier-1)
- Standard VPS
- AWS ECS on EC2 Capacity Provider (Pilot / Least Cost)
- AWS ECS Fargate (Elastic Auto-Scale)

### Port & Network Allocations (Unified Multi-Product Host)
- **Dumcholu Backend:** Port `8080` (Spring Boot Java 21)
- **Ugondu Backend:** Port `8081` (Node.js 20 Engine Core)
- **Universal UI Validator (UUV):** Port `8082`
- **Health / Readiness Path:** `/health/ready`
- **Federated Endpoints:**
  - Licensing & Authority: `https://license.airroofers.eu`
  - Commercial Billing: `https://billing.airroofers.eu/api/v1`
  - Identity Node: `https://identity.airroofers.eu/api/v1`
  - Telemetry Ingestion: `https://telemetry.airroofers.eu`

---

## 2. Manifest & Template Directory

```txt
deploy/aws/
├── AWS_DEPLOYMENT_GUIDE.md
├── task-definition.ecs.json
├── render-task-definition.mjs
├── render-task-definition.test.mjs
└── cloudformation/
    ├── ecs-ec2-capacity-provider.cfn.yaml
    └── ecs-fargate-service.cfn.yaml
```

---

## 3. Sizing & Cost Governance

- **EC2 Instance Type:** `t3.medium` default (4 GiB RAM, 2 vCPUs).
- **Task Resources:** `cpu: 256` (0.25 vCPU), `memory: 512` (512 MB).
- **Budget Notification:** AWS Budgets notification configured at 80% actual and 100% forecasted.
- **Fail-Closed Secrets:** Database credentials and keys are referenced exclusively via AWS Secrets Manager ARNs.
