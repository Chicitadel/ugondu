# Ugondu Universal Deployment Resource & Authorization Catalogue

**Task:** UG-UPLM-BOOTSTRAP-UNIVERSAL-001  
**Status:** Canonical planning inventory; not proof of runtime support  
**Branch:** fix/universal-bootstrap-cloud-provisioning-2026-10-26  
**Governance:** UAIGOS / Air Roofers  
**Companion registry:** .governance/platform/bootstrap/universal-bootstrap-capabilities.json

## 1. Purpose and interpretation

This is a broad inventory of resource families Ugondu may need to discover, create, configure, deploy, verify, repair, scale, restore, or remove. It is not a static permission grant and cannot enumerate every API action or every vendor feature. Before execution, resolve the actual plan into exact API actions, resource identifiers, condition keys, roles, resource policies, prerequisites and teardown effects using current provider authorization references.

For each resource family, model the supported operations separately: discover/read; create; configure/update; deploy/activate; verify/observe; backup/restore; scale; rotate; rollback; delete/destroy. Not every workflow needs every operation. Destructive operations require separate authorization.

## 2. Cross-platform authorization objects

- Human identity, machine/service principal, federated identity, workload identity, managed identity, session identity and delegation relationship.
- Role, group, permission set, policy, policy attachment/binding, trust relationship, permission boundary, organization policy/SCP, conditional grant, resource-based policy, token/key/certificate, secret reference, session tags and audit identity.
- Account/project/subscription/tenant/organization/folder, region/zone, resource group, namespace/cluster, workspace, environment, network boundary, labels/tags and billing scope.
- Provider API scopes, CLI/SDK credential chain, OIDC issuer/audience/subject restrictions, OAuth scopes, SSH certificate/host keys, CI runner identity, IDE extension identity, agent identity and plugin capability manifest.
- Approval object, plan digest, policy digest, state-lock lease, operation/idempotency key, checkpoint, evidence receipt, ownership/provenance record, retention policy and rollback authorization.

## 3. AWS resource families

### Identity, authorization and governance
IAM users (inventory or migration only where needed), groups, roles, customer-managed policies, inline policies, policy versions, instance profiles, trust policies, service-linked roles, permissions boundaries, access keys (avoid long-lived keys), role sessions and session tags. IAM Identity Center permission sets/assignments; Organizations accounts, OUs, SCPs and delegated administrators; STS AssumeRole and web identity; IAM Access Analyzer and policy simulation. KMS key policies/grants and Secrets Manager/SSM access policies; CloudFormation execution roles; service roles; workload roles; constrained iam:PassRole. CloudTrail, Config, Security Hub, GuardDuty, Inspector, Detective, Macie, Audit Manager and Control Tower where enabled.

### Infrastructure as code and orchestration
CloudFormation stacks, stack sets, change sets, stack policies, templates, parameters, outputs, exports/imports, drift detections, events, rollback triggers and service roles. Terraform/OpenTofu remote backend, state objects/versions, lock lease, workspace, provider/module registry, lockfile, immutable plan, variables/secrets references, state encryption and policy-as-code results. AWS CDK bootstrap resources (often S3 asset buckets, ECR repositories, IAM roles/policies and SSM parameters); SAM/Serverless Framework artifacts and deployment buckets. Systems Manager Automation, Run Command, Parameter Store, AppConfig and Change Manager where used.

### Networking, connectivity and edge
VPCs, subnets, route tables/routes, internet/NAT/egress-only gateways, VPC endpoints, peering, Transit Gateway, VPN, Direct Connect, IPAM, prefix lists, elastic IPs, ENIs, security groups, network ACLs, flow logs, DHCP options and network firewall. Route 53 public/private zones, record sets, health checks, routing policies, query logging, Resolver endpoints/rules/profiles, DNSSEC keys, domain registration/transfer and delegation sets. CloudFront distributions, origins, origin access controls/identities, cache/origin request policies, response headers policies, functions, key groups, invalidations, logs and deployment policies. WAF web ACLs/rules/IP sets, Shield, Global Accelerator, API Gateway custom domains and VPC links.

### Certificates, cryptography and secrets
ACM public/private certificates, validation records, renewal/association and Private CA if private PKI is needed. KMS keys, aliases, grants, key policies and rotation; Secrets Manager secrets/versions/rotation; SSM Parameter Store secure strings; CloudHSM only when explicitly required. CloudFront viewer certificates must be in us-east-1; regional service certificates generally belong in the service's target region.

### Compute and application runtime
EC2 instances, launch templates, AMIs, EBS volumes/snapshots, Auto Scaling groups/policies, placement groups, Spot fleets, Elastic Beanstalk, Lightsail where supported. ECS clusters/services/task definitions/tasks/capacity providers/Fargate, ECR repositories/images/lifecycle policies, EKS clusters/node groups/add-ons/access entries, Lambda functions/layers/versions/aliases/event mappings, App Runner and Batch. ALB/NLB, target groups/listeners/rules; API Gateway APIs/stages/deployments/authorizers/usage plans/domain names/VPC links. Amplify Hosting, CodeDeploy and service-specific runtime resources.

### Data, storage and messaging
S3 buckets/objects/versions/access points/replication/lifecycle/CORS/website settings/notifications; EFS, FSx, Storage Gateway and AWS Backup vaults/plans/recovery points. RDS/Aurora instances/clusters/subnet groups/parameter groups/proxies/snapshots; DynamoDB tables/indexes/streams/backups/PITR; ElastiCache/MemoryDB; Redshift, OpenSearch, DocumentDB, Neptune, Keyspaces, Timestream and other selected data services. Glue catalogs/jobs, Lake Formation permissions, Athena, EMR, Kinesis, MSK, SQS, SNS, EventBridge, Step Functions, CodeArtifact, artifact storage and signing/provenance resources.

### Delivery, observability, reliability and cost
CodePipeline, CodeBuild, CodeDeploy, CodeConnections, CodeArtifact, S3 artifact buckets, ECR, signing profiles, SBOM/provenance artifacts and approvals. CloudWatch log groups/streams, metrics, dashboards, alarms, canaries, X-Ray, CloudTrail, Config history, health events, OTel collectors, SNS alerting. AWS Backup, restore points, Elastic Disaster Recovery, Route 53 failover, autoscaling, quotas, budgets, Cost Explorer and cost allocation tags. Cognito, SES, Bedrock or SageMaker only when the chosen workload requires them. Other specialized AWS families must be added through reviewed capability extensions, not wildcard grants.

## 4. Microsoft Azure resource families

- Identity/governance: Entra ID apps/service principals, managed identities, app registrations, federated credentials, groups, directory roles, OAuth permissions, Azure RBAC role definitions/assignments/custom roles, management groups, subscriptions, resource groups, Azure Policy definitions/assignments/exemptions, locks, tags, PIM, Activity Log and tenant restrictions.
- Secrets/crypto: Key Vault keys/secrets/certificates, managed HSM, private endpoints, access policies or Key Vault RBAC.
- Infrastructure/network: ARM/Bicep deployments, deployment stacks, template specs, VNets/subnets/routes/NSGs, public IPs, NAT Gateway, Azure Firewall, VPN/ExpressRoute, peering, Private Link, DNS zones/records, Private DNS Resolver, Traffic Manager, Front Door, CDN, DDoS, Application Gateway/WAF, Load Balancer, Bastion and Network Watcher.
- Compute/runtime: VMs, VM scale sets, disks/snapshots/images, App Service plans/apps/slots, Functions, Container Apps, Container Instances, AKS clusters/node pools/managed identities/RBAC, ACR repositories/images/tokens, Batch and other selected runtimes.
- Delivery/integration: Azure DevOps organizations/projects/repos/pipelines/service connections/agent pools/environments/approvals/variable groups/secure files/artifact feeds; GitHub OIDC; App Configuration, API Management, Logic Apps and Event Grid.
- Data/operations: Storage accounts/blobs/queues/files/tables, SQL, PostgreSQL/MySQL, Cosmos DB, Synapse, Data Factory, Event Hubs, Service Bus, Azure Monitor, Log Analytics, Application Insights, alerts/action groups, managed Prometheus/Grafana, Defender for Cloud, Backup/Recovery Services vaults and Cost Management.

## 5. Google Cloud Platform resource families

- Identity/governance: organizations, folders, projects, billing accounts, service accounts, service-account keys (avoid static keys), Workload Identity Federation, IAM roles/bindings/members/custom roles, impersonation grants, org policies, IAM Conditions, tags, Policy Troubleshooter/Analyzer, Security Command Center, Cloud Audit Logs, Cloud Asset Inventory and VPC Service Controls.
- Secrets/crypto: Cloud KMS key rings/keys/versions, Secret Manager, Certificate Authority Service and access policies.
- Infrastructure/network: Compute Engine instances/templates/MIGs/disks/images/snapshots; VPCs/subnets/routes/firewall rules/Cloud NAT/routers/addresses/forwarding rules/peering/VPN/Interconnect/Private Service Connect; Cloud DNS zones/records/policies/DNSSEC; Certificate Manager; load balancing, Cloud CDN, Cloud Armor and Network Connectivity Center.
- Runtime/delivery: Cloud Run services/jobs, Cloud Functions, GKE clusters/node pools/RBAC/workload identity, Artifact Registry, Cloud Build, Cloud Deploy, App Engine, build triggers, deployment service accounts, binary authorization and provenance.
- Data/operations: Cloud Storage, Persistent Disk, Filestore, Cloud SQL, AlloyDB, Spanner, Firestore, Bigtable, BigQuery, Memorystore, Pub/Sub, Dataflow, Dataproc, Composer, Monitoring, Logging buckets/sinks, Trace, Error Reporting, backup/DR, budgets, billing exports and quotas.
- Terraform IAM nuance: authoritative policies/bindings can overwrite grants managed outside Terraform. Prefer additive member grants unless Ugondu explicitly owns the complete policy scope and has approval.

## 6. Kubernetes and container platforms

Cluster lifecycle/control plane, contexts/endpoints, node pools/upgrades/autoscaling; cloud IAM/OIDC/workload identity and service accounts; Roles, ClusterRoles, RoleBindings, ClusterRoleBindings and admission policies; namespaces, quotas, limit ranges, labels; Deployments, StatefulSets, DaemonSets, ReplicaSets, Pods, Jobs, CronJobs, Services, EndpointSlices, Ingress/Gateway API, NetworkPolicies, PodDisruptionBudgets, HPA/VPA and resource limits. ConfigMaps, Secrets/external secret stores, CSI drivers, StorageClasses, PV/PVC/snapshots/backup; CRDs/operators, Helm, Kustomize, OPA/Gatekeeper/Kyverno, webhooks and image-signature policy. Ingress controllers, cert-manager, external-dns, service meshes/mTLS, telemetry, registries, image scanning, SBOMs, signatures, logs, metrics, traces, events, probes, rollout and rollback history. Kubernetes RBAC is separate from cloud IAM and registry authorization.

## 7. Terraform and other IaC engines

Terraform/OpenTofu binaries and versions, provider/module registries, lockfiles, backend bucket/container, state objects/versions, lock leases, workspaces, plans/applies/refresh/import/state moves/destroy, remote runners/logs/cache. Pulumi organizations/projects/stacks/state backends/secrets providers/stack config/policy packs. AWS CDK, SAM, Serverless Framework, Azure ARM/Bicep, Google deployment tooling, Helm, Kustomize, Ansible, Packer, Chef/Puppet and configuration-management adapters. Pin dependencies, encrypt state, lock concurrent operations, bind apply to an immutable approved plan, redact variables, and separately authorize destructive operations.

## 8. VPS, private cloud and hypervisors

Provider account/project, API tokens/service users/teams/role grants, SSH certificates/host keys, audit logs; VMs/instances/templates/images/disks/volumes/snapshots/groups/quotas; networks/subnets/routes/firewalls/public IPs/load balancers/DNS/private connectivity; object/block/file storage, backups, databases, managed Kubernetes, registries, secrets/KMS, TLS and monitoring. Proxmox: datacenters/clusters/nodes/VMs/containers/pools/storage/bridges/VLANs/SDN/firewalls/backups/ACLs. VMware vSphere: vCenter/datacenters/clusters/hosts/resource pools/folders/VMs/templates/datastores/networks/content libraries/snapshots/roles. OpenStack: Keystone projects/roles, Nova servers, Neutron networks/routers/security groups/floating IPs, Cinder volumes/snapshots, Glance images, Swift/Manila, Octavia, Heat, Barbican and telemetry. Host configuration includes packages, services, firewall, reverse proxy, runtime, TLS, deployment paths, process manager, cron, backup and health checks, subject to explicit platform capabilities.

## 9. Shared hosting and control panels

For cPanel, DirectAdmin, Plesk and similar systems, inventory only the account's actual capabilities: panel account/subscription, domain/vhost, DNS, databases/users/grants, backups, file/SFTP accounts, SSH, cron, runtime selector, environment variables, logs, quotas, TLS/ACME, redirects, supported web-server settings, mail routing and health endpoints. Node/PHP/Python/Ruby runtimes only where available. Do not assume root, Docker, systemd, arbitrary daemons, kernel modules, unrestricted firewall changes, outbound ports or DNS API access. Missing capability means unsupported/manual handoff, not simulated success.

## 10. External DNS, registrars, CDN, certificates and email

Cloudflare and other managed DNS providers: zones, records, delegation, DNSSEC, health checks, query logs, access policies and tokens. Registrars: domain registration/transfer, nameservers, contact verification, transfer locks, renewals, DS records and authorization codes; transfer/registrant changes require high-risk approval. CDN/edge/WAF providers: distributions, origins, cache rules, custom hostnames, certificates, WAF, logs, purge/invalidation and rollback. Certificate authorities: ACME accounts, DNS-01/HTTP-01 challenges, private-key custody, renewal/revocation and expiry. Email domain resources: SPF/DKIM/DMARC/MX/TXT, sender verification and transactional-email settings. Vendor-specific tokens and scopes must never be conflated with AWS IAM.

## 11. Git providers, CI/CD and registries

GitHub repositories, environments, Actions workflows/runners, OIDC, rulesets, secrets/variables, packages, releases, artifacts, deployments, checks, webhooks, apps/installations and permissions. GitLab groups/projects/runners/CI variables/environments/protected refs/deploy tokens/OIDC/package and container registries/approvals/audit. Bitbucket workspaces/repos/Pipelines/deployments/variables/runners/access tokens. Azure DevOps organizations/projects/repos/pipelines/service connections/environments/approvals/variable groups/secure files/agent pools/feeds. Gitea/Gogs organizations/repos/deploy keys/webhooks/actions runners/packages/releases/users/teams/tokens. AWS CodeCommit/CodeBuild/CodePipeline/CodeArtifact; Azure Container Registry/Artifacts; Google Artifact Registry/Cloud Build; Docker Hub/private OCI registries. Include signing, attestations, SBOM, provenance, scanning, retention, promotion, immutability and digest verification.

## 12. Databases, stateful services and data protection

Database service/cluster/instance, database/schema/table, users/roles/grants, network allowlists/private endpoints, parameter/extensions, backup schedules/snapshots/PITR, replicas/failover, encryption keys, secret rotation, audit logs and maintenance windows. Object buckets/containers, file shares, volumes, snapshots, replication, retention/legal hold/object lock, restore tests. Brokers/queues/topics/subscriptions, schema registries, dead-letter queues, consumer identities and retention. Data pipelines, migration jobs, ETL roles, catalogs, access controls, encryption, lineage and audit events. Creating a database does not imply permission to read, migrate or destroy its data.

## 13. Security, observability, resilience and cost

Secret stores, KMS/HSM, certificates, workload identity, vulnerability/image scanners, SAST/DAST/SCA, policy engines, audit services, SIEM and incident systems. Logs/metrics/traces, alerts, dashboards, uptime checks, health endpoints, event subscriptions and paging. Backup/archive/retention/immutable storage/restore drills/disaster recovery/regional failover/replication/RPO/RTO. Quotas, billing exports, budgets, spend alerts, tags, capacity reservations, rightsizing and service-limit requests. Compliance evidence, approvals, change tickets, signed receipts, provenance, SBOMs and release attestations.

## 14. Operation-to-permission matrix

| Operation | Permission class | Mandatory safeguard |
|---|---|---|
| Discover/inventory | Read/list/describe | Verify account/tenant; redact output |
| Plan/validate | Read + dry-run/plan | No unintended mutation; bind plan digest |
| Create/provision | Create/write | Approved scope, quota/cost checks, idempotency |
| Configure/update | Update/attach/associate | Review diff; preserve unowned state |
| Deploy/activate | Start/execute/publish | Approved artifact, provenance and health checks |
| Verify/diagnose | Read/health/logs | Independent read-back; bounded log access |
| Repair/remediate | Update/replace/restart | Root-cause evidence and blast-radius limits |
| Scale/migrate | Scale/replicate/cutover | Capacity, consistency and rollback |
| Backup/restore | Snapshot/backup/restore | Retention, encryption and restore validation |
| Rollback | Revert/shift/restore | Known-good version and data-safety approval |
| Delete/destroy | Delete/terminate/revoke | Explicit approval, ownership and dependency checks |

## 15. Logical policy bundles

1. Inventory/diagnostic: read-only inventory, status, logs and policy introspection where authorized.
2. Plan/validation: reads, dry-run APIs, policy analysis and plan generation.
3. Workload execution: scoped create/update on approved resource types and environments.
4. Bootstrap handoff: identity/trust/policy/CloudFormation service-role operations authorized by an existing administrator; never self-granted.
5. DNS/TLS: exact zone/record scope, certificate lifecycle and approved endpoint association.
6. Artifact/build: source read, build, artifact storage, registry push/pull, signing/attestation as required.
7. Runtime: only workload runtime data/service access; never deployment administrator by default.
8. Observability: logs/metrics/traces/alarms without deployment write access unless required.
9. Backup/recovery: backup/restore/failover under data-protection controls.
10. Cleanup: delete only resources with verified ownership/provenance and separate destruction approval.

These are logical profiles, not a requirement to create ten physical roles for every deployment. Combine only where trust boundaries and least privilege remain sound.

## 16. Mandatory generation and execution rules

- Derive exact action names from current provider API operations and authorization references; never infer actions from resource names alone.
- Model dependent actions and service-linked roles. CloudFormation can invoke other services, but the caller and execution role still require the permissions appropriate to their duties.
- Distinguish console-only permissions from headless CLI/API permissions.
- Evaluate identity policy, resource policy, trust, boundary, organization/SCP, session policy, conditions, region, partition, tenant and provider-level restrictions.
- Allow Resource wildcard only where the API cannot scope to a resource or the operation genuinely requires it; document the reason and use supported conditions.
- Prohibit wildcard administrator policies as the default, unbounded iam:PassRole, unreviewed trust changes, long-lived secrets and silent credential fallback.
- Preserve existing grants. Prefer additive IAM member grants over authoritative policy replacement unless Ugondu owns the complete scope and has approval.
- Every denial returns a typed error, non-zero exit, exact missing-authority detail and resumable checkpoint. Never swallow exceptions into success.
- Read back important mutations; detect drift; reconcile partial state; record provider request IDs.
- Require explicit approval for public exposure, privilege escalation, destructive data changes, domain transfer, DNS deletion, outage-risk key rotation, resource destroy and cross-account access.
- UI, CLI, IDE, model-free and model-assisted actors must share one authorization path and one canonical registry.

## 17. Qualification states

Use per-resource-family states: Implemented; Unit-tested; Integration-tested; Physically qualified; Certified; Unsupported/blocked. Do not infer support from inclusion in this catalogue. Generate and validate the exact action-level permission map for each target, account, tenant, region, adapter version and plan.

## 18. Official references

- AWS CloudFormation IAM: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/control-access-with-iam.html
- AWS IAM service authorization references: https://docs.aws.amazon.com/service-authorization/latest/reference/reference_policies_actions-resources-contextkeys.html
- Route 53 authorization: https://docs.aws.amazon.com/service-authorization/latest/reference/list_route53.html
- ACM authorization: https://docs.aws.amazon.com/service-authorization/latest/reference/list_acm.html
- CloudFront IAM: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/security_iam_service-with-iam.html
- Terraform AWS provider core services: https://hashicorp.github.io/terraform-provider-aws/core-services/
- Google Cloud Terraform IAM practices: https://docs.cloud.google.com/docs/terraform/best-practices/working-with-resources
- Azure RBAC: https://learn.microsoft.com/en-us/azure/role-based-access-control/overview
- Kubernetes RBAC: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

**Acceptance boundary:** This catalogue is a planning inventory only. Runtime permission generation, adapter implementation, tests, exact-head CI/COR and physical qualification remain mandatory separate gates.
