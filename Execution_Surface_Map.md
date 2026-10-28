# Execution Surface Map

## Externally Executable Actions and Traces

| Action ID | Domain | Target Environment | Executor (Adapter) | Assessment |
| --- | --- | --- | --- | --- |
| `compute:instance:create` | Compute | AWS (EC2) | `AwsAdapter` | **UNQUALIFIED** (Hardcodes capacity 2 cores / 4GB RAM) |
| `compute:instance:terminate` | Compute | AWS (EC2) | `AwsAdapter` | Qualified |
| `database:relational:create` | Database | AWS (RDS) | `AwsAdapter` | **UNQUALIFIED** (Hardcodes `postgres`, 20GB, dummy dbSubnetGroupName) |
| `database:relational:terminate` | Database | AWS (RDS) | `AwsAdapter` | Qualified |
| `storage:object:put` | Storage | AWS (S3) | `AwsAdapter` | **UNQUALIFIED** (Hardcodes dummy payload) |
| `network:vpc:create` | Network | AWS (VPC) | `AwsAdapter` | **UNQUALIFIED** (Hardcodes name) |
| `network:vpc:terminate` | Network | AWS (VPC) | `AwsAdapter` | Qualified |
| `container:registry:create` | Container | AWS | `AwsAdapter` | **UNQUALIFIED** |
| `container:image:build` | Container | AWS | `AwsAdapter` | **UNQUALIFIED** |
| `container:image:push` | Container | AWS | `AwsAdapter` | **UNQUALIFIED** |
| `container:task-definition:create` | Container | AWS | `AwsAdapter` | **UNQUALIFIED** |
| `container:service:create` | Container | AWS | `AwsAdapter` | **UNQUALIFIED** |
| `orchestration:container:deploy` | Orchestration | AWS (Fargate) | `AwsAdapter` | **UNQUALIFIED** |
| `ugondu:deploy` | Orchestration | AWS | `AwsAdapter` | **UNQUALIFIED** |
| `network:subnet:create` | Network | AWS | `AwsAdapter` | Qualified |
| `network:subnet:terminate` | Network | AWS | `AwsAdapter` | Qualified |
| `network:security-group:create` | Network | AWS | `AwsAdapter` | **UNQUALIFIED** |
| `network:security-group:terminate`| Network | AWS | `AwsAdapter` | Qualified |
| `storage:ebs-snapshot:create` | Storage | AWS (EBS) | `AwsAdapter` | Qualified |
| `database:rds-subnet-group:create`| Database | AWS (RDS) | `AwsAdapter` | Qualified |
| `database:rds-snapshot:create` | Database | AWS (RDS) | `AwsAdapter` | Qualified |
| `storage:s3:create` | Storage | AWS (S3) | `AwsAdapter` | Qualified |

## Hard-coded Assumptions in Other Providers

- **Linux / VPS (`linux.ts`)**: `getInstanceStatus` is mocked to always return `{ state: 'running', health: 'healthy' }`.
- **cPanel (`cpanel.ts`)**: Replaced stubs with `NotImplementedError`.
- **Kubernetes**: Supports `DEPLOYMENT` and `STATEFULSET`, but missing database logic (deliberately marked `UNSUPPORTED`).
- **DirectAdmin**: Replaced stubs with `NotImplementedError`. Added `UNQUALIFIED` target definition.
- **Docker**: Implemented via adapter.
- **GitHub**: Added `UNQUALIFIED` target definition.
- **Local**: Missing from provider fabric.

All `[UNQUALIFIED]` actions and unsupported boundaries have been securely excluded from the V1 certified deployment claims.
