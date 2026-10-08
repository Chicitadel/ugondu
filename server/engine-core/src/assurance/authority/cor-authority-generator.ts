import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export interface AuthorityPermission {
    action: string;
    resources: string[];
}

export interface CORAuthorityManifest {
    version: number;
    manifest: string;
    provider: string;
    region: string;
    corProfile: string;
    executionRole: {
        name: string;
    };
    permissions: AuthorityPermission[];
    verification: { required: boolean };
    recovery: { required: boolean };
    rollback: { required: boolean };
    leastPrivilege: { required: boolean };
    approval: { required: boolean };
    provenance: {
        generatedFrom: string[];
    };
    lifecycle: {
        bootstrap: string;
        execution: string;
        retirement: string;
    };
}

// Statically maps abstract operations to AWS-specific execution policies
const AWS_AUTHORITY_MAP: Record<string, AuthorityPermission[]> = {
    'ssm:resolveAmi': [
        { action: 'ssm:GetParameter', resources: ['arn:aws:ssm:*:*:parameter/aws/service/ami-amazon-linux-latest/*'] }
    ],
    'network:vpc:create': [
        { action: 'ec2:CreateVpc', resources: ['arn:aws:ec2:*:*:vpc/*'] },
        { action: 'ec2:CreateTags', resources: ['arn:aws:ec2:*:*:vpc/*'] }
    ],
    'network:vpc:terminate': [
        { action: 'ec2:DeleteVpc', resources: ['arn:aws:ec2:*:*:vpc/*'] }
    ],
    'network:subnet:create': [
        { action: 'ec2:CreateSubnet', resources: ['arn:aws:ec2:*:*:subnet/*', 'arn:aws:ec2:*:*:vpc/*'] },
        { action: 'ec2:CreateTags', resources: ['arn:aws:ec2:*:*:subnet/*'] }
    ],
    'network:subnet:terminate': [
        { action: 'ec2:DeleteSubnet', resources: ['arn:aws:ec2:*:*:subnet/*'] }
    ],
    'network:security-group:create': [
        { action: 'ec2:CreateSecurityGroup', resources: ['arn:aws:ec2:*:*:security-group/*', 'arn:aws:ec2:*:*:vpc/*'] },
        { action: 'ec2:CreateTags', resources: ['arn:aws:ec2:*:*:security-group/*'] }
    ],
    'network:security-group:terminate': [
        { action: 'ec2:DeleteSecurityGroup', resources: ['arn:aws:ec2:*:*:security-group/*'] }
    ],
    'compute:instance:create': [
        { action: 'ec2:RunInstances', resources: ['arn:aws:ec2:*:*:instance/*', 'arn:aws:ec2:*:*:subnet/*', 'arn:aws:ec2:*:*:network-interface/*', 'arn:aws:ec2:*:*:volume/*', 'arn:aws:ec2:*:*:security-group/*', 'arn:aws:ec2:*:*:image/*'] },
        { action: 'ec2:CreateTags', resources: ['arn:aws:ec2:*:*:instance/*'] }
    ],
    'compute:instance:terminate': [
        { action: 'ec2:TerminateInstances', resources: ['arn:aws:ec2:*:*:instance/*'] }
    ],
    'storage:ebs-snapshot:create': [
        { action: 'ec2:CreateSnapshot', resources: ['arn:aws:ec2:*:*:volume/*', 'arn:aws:ec2:*:*:snapshot/*'] },
        { action: 'ec2:CreateTags', resources: ['arn:aws:ec2:*:*:snapshot/*'] }
    ],
    'storage:ebs-snapshot:terminate': [
        { action: 'ec2:DeleteSnapshot', resources: ['arn:aws:ec2:*:*:snapshot/*'] }
    ],
    'database:rds-subnet-group:create': [
        { action: 'rds:CreateDBSubnetGroup', resources: ['arn:aws:rds:*:*:subgrp:*'] },
        { action: 'rds:AddTagsToResource', resources: ['arn:aws:rds:*:*:subgrp:*'] }
    ],
    'database:rds-subnet-group:terminate': [
        { action: 'rds:DeleteDBSubnetGroup', resources: ['arn:aws:rds:*:*:subgrp:*'] }
    ],
    'database:relational:create': [
        { action: 'rds:CreateDBInstance', resources: ['arn:aws:rds:*:*:db:*', 'arn:aws:rds:*:*:subgrp:*', 'arn:aws:rds:*:*:secgrp:*'] },
        { action: 'rds:AddTagsToResource', resources: ['arn:aws:rds:*:*:db:*'] }
    ],
    'database:relational:terminate': [
        { action: 'rds:DeleteDBInstance', resources: ['arn:aws:rds:*:*:db:*'] }
    ],
    'database:rds-snapshot:create': [
        { action: 'rds:CreateDBSnapshot', resources: ['arn:aws:rds:*:*:snapshot:*', 'arn:aws:rds:*:*:db:*'] },
        { action: 'rds:AddTagsToResource', resources: ['arn:aws:rds:*:*:snapshot:*'] }
    ],
    'database:rds-snapshot:terminate': [
        { action: 'rds:DeleteDBSnapshot', resources: ['arn:aws:rds:*:*:snapshot:*'] }
    ],
    'storage:s3:create': [
        { action: 's3:CreateBucket', resources: ['arn:aws:s3:::*'] },
        { action: 's3:PutBucketTagging', resources: ['arn:aws:s3:::*'] }
    ],
    'storage:s3:terminate': [
        { action: 's3:DeleteBucket', resources: ['arn:aws:s3:::*'] }
    ],
    'storage:object:put': [
        { action: 's3:PutObject', resources: ['arn:aws:s3:::*/*'] }
    ],
    'storage:object:delete': [
        { action: 's3:DeleteObject', resources: ['arn:aws:s3:::*/*'] }
    ],
    'drift:injection': [
        { action: 'ec2:CreateTags', resources: ['arn:aws:ec2:*:*:instance/*'] },
        { action: 'ec2:DeleteTags', resources: ['arn:aws:ec2:*:*:instance/*'] }
    ],
    'drift:residual-scan': [
        { action: 'ec2:DescribeVpcs', resources: ['*'] },
        { action: 'ec2:DescribeSubnets', resources: ['*'] },
        { action: 'ec2:DescribeSecurityGroups', resources: ['*'] },
        { action: 'ec2:DescribeInstances', resources: ['*'] },
        { action: 'rds:DescribeDBInstances', resources: ['*'] },
        { action: 's3:ListAllMyBuckets', resources: ['*'] }
    ]
};

// Represents the static graph of operations inside physical-certification.ts
const PHYSICAL_COR_GRAPH = [
    'ssm:resolveAmi',
    'network:vpc:create',
    'network:subnet:create',
    'network:security-group:create',
    'compute:instance:create',
    'storage:ebs-snapshot:create',
    'database:rds-subnet-group:create',
    'database:relational:create',
    'database:rds-snapshot:create',
    'storage:s3:create',
    'storage:object:put',
    'drift:injection',
    // Verification & rollback graph
    'storage:object:delete',
    'storage:s3:terminate',
    'database:rds-snapshot:terminate',
    'database:relational:terminate',
    'database:rds-subnet-group:terminate',
    'storage:ebs-snapshot:terminate',
    'compute:instance:terminate',
    'network:security-group:terminate',
    'network:subnet:terminate',
    'network:vpc:terminate',
    'drift:residual-scan'
];

export class CORAuthorityCalculator {
    public getGraph() {
        return PHYSICAL_COR_GRAPH;
    }

    public getMap() {
        return AWS_AUTHORITY_MAP;
    }

    public generateAwsManifest(region: string, accountId: string, roleName: string): CORAuthorityManifest {
        const permissionsMap = new Map<string, Set<string>>();

        for (const operation of PHYSICAL_COR_GRAPH) {
            const mappedAuths = AWS_AUTHORITY_MAP[operation];
            if (!mappedAuths) {
                console.warn(`DYNAMIC_AUTHORITY_REQUIRED: No static map for ${operation}`);
                continue;
            }

            for (const auth of mappedAuths) {
                if (!permissionsMap.has(auth.action)) {
                    permissionsMap.set(auth.action, new Set());
                }
                const resourceSet = permissionsMap.get(auth.action)!;
                for (let res of auth.resources) {
                    // Contextualize ARNs with region and account id if possible
                    res = res.replace('arn:aws:ec2:*:*', `arn:aws:ec2:${region}:${accountId}`);
                    res = res.replace('arn:aws:rds:*:*', `arn:aws:rds:${region}:${accountId}`);
                    res = res.replace('arn:aws:ssm:*:*', `arn:aws:ssm:${region}:${accountId}`);
                    resourceSet.add(res);
                }
            }
        }

        const permissions: AuthorityPermission[] = [];
        for (const [action, resources] of permissionsMap.entries()) {
            permissions.push({
                action,
                resources: Array.from(resources)
            });
        }

        return {
            version: 1,
            manifest: 'ugondu-cor-authority',
            provider: 'aws',
            region,
            corProfile: 'physical-fargate-v1',
            executionRole: { name: roleName },
            permissions,
            verification: { required: true },
            recovery: { required: true },
            rollback: { required: true },
            leastPrivilege: { required: true },
            approval: { required: true },
            provenance: {
                generatedFrom: ['cor-profile', 'execution-graph', 'provider-capability-registry']
            },
            lifecycle: {
                bootstrap: 'temporary',
                execution: 'ephemeral-or-scoped',
                retirement: 'required'
            }
        };
    }

    public exportToIAMPolicy(manifest: CORAuthorityManifest): object {
        const statements = manifest.permissions.map((p, idx) => ({
            Sid: `CORAuthority${idx}`,
            Effect: 'Allow',
            Action: p.action,
            Resource: p.resources.length === 1 ? p.resources[0] : p.resources
        }));

        return {
            Version: '2012-10-17',
            Statement: statements
        };
    }

    public dumpHumanReadable(manifest: CORAuthorityManifest): string {
        const actionsCount = manifest.permissions.length;
        const resourcesCount = manifest.permissions.reduce((acc, p) => acc + p.resources.length, 0);
        
        return `====================================================
 UGONDU COR AUTHORITY REQUEST
====================================================

Provider: ${manifest.provider.toUpperCase()}
Region: ${manifest.region}
Account: ${manifest.executionRole.name.includes(':') ? manifest.executionRole.name : '971671216490'}
Role: ${manifest.executionRole.name}

Purpose:
Physical Certification of Ugondu AWS execution capability

Authority:
${actionsCount} actions
${resourcesCount} resource scopes
4 verification operations
3 recovery operations

Risk:
HIGH

Duration:
COR execution only

Credential model:
GitHub OIDC → short-lived STS credentials

Rollback:
Supported

Approval:
REQUIRED

====================================================`;
    }
}
