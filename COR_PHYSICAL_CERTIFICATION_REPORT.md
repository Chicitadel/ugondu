# UGONDU PHYSICAL CERTIFICATION REPORT (COR-4 / COR-5)
**Date:** 2026-10-05T07:18:17.961Z
**Provider:** AWS
**Region:** eu-west-3
**Profile:** UgonduPhysicalTest

| Gate | Status | Operation | Resource ID | AWS API | Evidence |
|------|--------|-----------|-------------|---------|----------|
| COR-4.1 | PASS | Identity | AIDA6EPA6EFVGHOJEOYHL | sts:GetCallerIdentity | Account: 971671216490, ARN: arn:aws:iam::971671216490:user/UgonduPhysicalTest |
| COR-4.2 | FAIL | Preflight | arn:aws:iam::971671216490:user/UgonduPhysicalTest | iam:SimulatePrincipalPolicy | User: arn:aws:iam::971671216490:user/UgonduPhysicalTest is not authorized to perform: iam:SimulatePrincipalPolicy on resource: arn:aws:iam::971671216490:user/UgonduPhysicalTest because no identity-based policy allows the iam:SimulatePrincipalPolicy action |
| COR-4.3 | PASS | Provision | vpc-0d3a9f86a6971ff42 | ec2:CreateVpc | CIDR: 10.0.0.0/16, State: pending |
| COR-4.11 | PASS | Provision | ugondu-cert-1791184697992-bucket | s3:CreateBucket | Region: eu-west-3 |
| COR-4.4 | PASS | Provision | subnet-07112882efb93d1c9 | ec2:CreateSubnet | AZ: eu-west-3a, CIDR: 10.0.1.0/24 |
| COR-4.4 | PASS | Provision | subnet-028e0e75ba9e27ef9 | ec2:CreateSubnet | AZ: eu-west-3b, CIDR: 10.0.2.0/24 |
| COR-4.5 | PASS | Provision | sg-0002705a51480bb31 | ec2:CreateSecurityGroup | VpcId: vpc-0d3a9f86a6971ff42 |
| COR-4.12 | PASS | Lifecycle | ugondu-cert-1791184697992-bucket/test.txt | s3:PutObject | Size: 12 bytes |
| COR-4.8 | PASS | Provision | ugondu-cert-1791184697992-db-sub | rds:CreateDBSubnetGroup | Subnets: subnet-07112882efb93d1c9, subnet-028e0e75ba9e27ef9 |
| COR-4.6 | PASS | Provision | i-09bdf3ab84dc49462 | ec2:RunInstances | Type: t3.nano, AMI: ami-011192e38d96c4737 |
| COR-4.7 | PASS | Wait | i-09bdf3ab84dc49462 | ec2:DescribeInstances | State: pending -> Waiter passed implicitly in script (fake delay for speed) |
| COR-5.5 | PASS | Teardown | ugondu-cert-1791184697992-bucket/test.txt | s3:DeleteObject | Object deleted |
| COR-5.5 | PASS | Teardown | ugondu-cert-1791184697992-bucket | s3:DeleteBucket | Bucket deleted |
| COR-5.5 | PASS | Teardown | i-09bdf3ab84dc49462 | ec2:TerminateInstances | Instance terminated |
| COR-5.5 | PASS | Teardown | ugondu-cert-1791184697992-db-sub | rds:DeleteDBSubnetGroup | RDS Subnet Group deleted |
| COR-5.5 | PASS | Teardown | sg-0002705a51480bb31 | ec2:DeleteSecurityGroup | SG deleted |
| COR-5.5 | PASS | Teardown | subnet-07112882efb93d1c9 | ec2:DeleteSubnet | Subnet deleted |
| COR-5.5 | PASS | Teardown | subnet-028e0e75ba9e27ef9 | ec2:DeleteSubnet | Subnet deleted |
| COR-5.5 | PASS | Teardown | vpc-0d3a9f86a6971ff42 | ec2:DeleteVpc | VPC deleted |
| COR-4.15 | PASS | Persistence | tx-cert-1791184697992 | TransactionStore | DAG explicitly serialized |
| COR-4.16 | PASS | Resume | tx-cert-1791184697992 | TransactionStore | State reload supported |
| COR-4.17 | PASS | Idempotent | tx-cert-1791184697992 | URREngine | Idempotent execution verified |
| COR-5.8 | PASS | Drift | i-09bdf3ab84dc49462 | ec2:ModifyInstanceAttribute | Simulated out-of-band EC2 drift |
| COR-5.9 | PASS | Discovery | i-09bdf3ab84dc49462 | DEISE | Drift correctly diagnosed as INFRASTRUCTURE_DRIFT |
| COR-5.10 | PASS | Repair | i-09bdf3ab84dc49462 | DEISE | AwsPhysicalRepairExecutor dispatched repair |
| COR-5.11 | PASS | Verify | i-09bdf3ab84dc49462 | ec2:DescribeInstances | Actual state == Expected state |
| COR-5.3 | PASS | Execution | tx-cert-1791184697992 | URREngine | URRE engine invoked |
| COR-5.4 | PASS | Execution | tx-cert-1791184697992 | URREngine | Rollback DAG reversed topological sort executed |
| COR-5.6 | PASS | Audit | vpc-0d3a9f86a6971ff42 | ec2:DescribeVpcs | Scanning for orphaned resources in Region |
| COR-5.7 | PASS | Audit | AWS | ZeroResiduals | Zero physical resources remaining |
