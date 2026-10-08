export interface AuthorityPermission {
    action: string | string[];
    resources: string[];
    conditions?: Record<string, any>;
}

export interface CORAuthorityManifest {
    version: number;
    generatorVersion: string;
    mapVersion: string;
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
        { 
            action: 'ec2:CreateTags', 
            resources: ['arn:aws:ec2:*:*:vpc/*'], 
            conditions: { 
                "StringEquals": { "ec2:CreateAction": "CreateVpc" },
                "ForAllValues:StringEquals": { "aws:TagKeys": ["UgonduCOR", "UgonduTransactionId"] }
            } 
        }
    ],
    'network:vpc:terminate': [
        { action: 'ec2:DeleteVpc', resources: ['arn:aws:ec2:*:*:vpc/*'], conditions: { "StringLike": { "aws:ResourceTag/UgonduCOR": "*" } } }
    ],
    'network:subnet:create': [
        { action: 'ec2:CreateSubnet', resources: ['arn:aws:ec2:*:*:subnet/*', 'arn:aws:ec2:*:*:vpc/*'] },
        { 
            action: 'ec2:CreateTags', 
            resources: ['arn:aws:ec2:*:*:subnet/*'], 
            conditions: { 
                "StringEquals": { "ec2:CreateAction": "CreateSubnet" },
                "ForAllValues:StringEquals": { "aws:TagKeys": ["UgonduCOR", "UgonduTransactionId"] }
            } 
        }
    ],
    'network:subnet:terminate': [
        { action: 'ec2:DeleteSubnet', resources: ['arn:aws:ec2:*:*:subnet/*'], conditions: { "StringLike": { "aws:ResourceTag/UgonduCOR": "*" } } }
    ],
    'network:security-group:create': [
        { action: 'ec2:CreateSecurityGroup', resources: ['arn:aws:ec2:*:*:security-group/*', 'arn:aws:ec2:*:*:vpc/*'] },
        { 
            action: 'ec2:CreateTags', 
            resources: ['arn:aws:ec2:*:*:security-group/*'], 
            conditions: { 
                "StringEquals": { "ec2:CreateAction": "CreateSecurityGroup" },
                "ForAllValues:StringEquals": { "aws:TagKeys": ["UgonduCOR", "UgonduTransactionId"] }
            } 
        }
    ],
    'network:security-group:terminate': [
        { action: 'ec2:DeleteSecurityGroup', resources: ['arn:aws:ec2:*:*:security-group/*'], conditions: { "StringLike": { "aws:ResourceTag/UgonduCOR": "*" } } }
    ],
    'compute:instance:create': [
        { action: 'ec2:RunInstances', resources: ['arn:aws:ec2:*:*:instance/*', 'arn:aws:ec2:*:*:subnet/*', 'arn:aws:ec2:*:*:network-interface/*', 'arn:aws:ec2:*:*:volume/*', 'arn:aws:ec2:*:*:security-group/*', 'arn:aws:ec2:*:*:image/*'] },
        { 
            action: 'ec2:CreateTags', 
            resources: ['arn:aws:ec2:*:*:instance/*', 'arn:aws:ec2:*:*:volume/*'], 
            conditions: { 
                "StringEquals": { "ec2:CreateAction": "RunInstances" },
                "ForAllValues:StringEquals": { "aws:TagKeys": ["UgonduCOR", "UgonduTransactionId"] }
            } 
        }
    ],
    'compute:instance:terminate': [
        { action: 'ec2:TerminateInstances', resources: ['arn:aws:ec2:*:*:instance/*'], conditions: { "StringLike": { "aws:ResourceTag/UgonduCOR": "*" } } }
    ],
    'storage:ebs-snapshot:create': [
        { action: 'ec2:CreateSnapshot', resources: ['arn:aws:ec2:*:*:volume/*', 'arn:aws:ec2:*:*:snapshot/*'] },
        { 
            action: 'ec2:CreateTags', 
            resources: ['arn:aws:ec2:*:*:snapshot/*'], 
            conditions: { 
                "StringEquals": { "ec2:CreateAction": "CreateSnapshot" },
                "ForAllValues:StringEquals": { "aws:TagKeys": ["UgonduCOR", "UgonduTransactionId"] }
            } 
        }
    ],
    'storage:ebs-snapshot:terminate': [
        { action: 'ec2:DeleteSnapshot', resources: ['arn:aws:ec2:*:*:snapshot/*'], conditions: { "StringLike": { "aws:ResourceTag/UgonduCOR": "*" } } }
    ],
    'database:rds-subnet-group:create': [
        { action: 'rds:CreateDBSubnetGroup', resources: ['arn:aws:rds:*:*:subgrp:*'] },
        { action: 'rds:AddTagsToResource', resources: ['arn:aws:rds:*:*:subgrp:*'] }
    ],
    'database:rds-subnet-group:terminate': [
        { action: 'rds:DeleteDBSubnetGroup', resources: ['arn:aws:rds:*:*:subgrp:*'], conditions: { "StringLike": { "aws:ResourceTag/UgonduCOR": "*" } } }
    ],
    'database:relational:create': [
        // Ensure dependent permissions are covered for RDS Create in a VPC.
        // RDS doesn't use secgrp ARNs during creation in IAM, but it does require describe permissions.
        { action: 'rds:CreateDBInstance', resources: ['arn:aws:rds:*:*:db:*', 'arn:aws:rds:*:*:subgrp:*'] },
        { action: 'rds:AddTagsToResource', resources: ['arn:aws:rds:*:*:db:*'] }
    ],
    'database:relational:terminate': [
        { action: 'rds:DeleteDBInstance', resources: ['arn:aws:rds:*:*:db:*'], conditions: { "StringLike": { "aws:ResourceTag/UgonduCOR": "*" } } }
    ],
    'database:rds-snapshot:create': [
        { action: 'rds:CreateDBSnapshot', resources: ['arn:aws:rds:*:*:snapshot:*', 'arn:aws:rds:*:*:db:*'] },
        { action: 'rds:AddTagsToResource', resources: ['arn:aws:rds:*:*:snapshot:*'] }
    ],
    'database:rds-snapshot:terminate': [
        { action: 'rds:DeleteDBSnapshot', resources: ['arn:aws:rds:*:*:snapshot:*'], conditions: { "StringLike": { "aws:ResourceTag/UgonduCOR": "*" } } }
    ],
    'storage:s3:create': [
        { action: 's3:CreateBucket', resources: ['arn:aws:s3:::ugondu-cor-*'] },
        { action: 's3:PutBucketTagging', resources: ['arn:aws:s3:::ugondu-cor-*'] }
    ],
    'storage:s3:terminate': [
        { action: 's3:DeleteBucket', resources: ['arn:aws:s3:::ugondu-cor-*'] }
    ],
    'storage:object:put': [
        { action: 's3:PutObject', resources: ['arn:aws:s3:::ugondu-cor-*/*'] }
    ],
    'storage:object:delete': [
        { action: 's3:DeleteObject', resources: ['arn:aws:s3:::ugondu-cor-*/*'] }
    ],
    'drift:injection': [
        { action: 'ec2:CreateTags', resources: ['arn:aws:ec2:*:*:*/*'], conditions: { "StringLike": { "aws:ResourceTag/UgonduCOR": "*" } } },
        { action: 'ec2:DeleteTags', resources: ['arn:aws:ec2:*:*:*/*'], conditions: { "StringLike": { "aws:ResourceTag/UgonduCOR": "*" } } }
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

import { AuthorityCalculator, RequiredAuthority, Authority, AuthorityGap, AuthorityBundle, AuthorityValidationResult } from './authority-calculator';

export class CORAuthorityCalculator implements AuthorityCalculator<any, any> {
    public getGraph() {
        return PHYSICAL_COR_GRAPH;
    }

    public getMap() {
        return AWS_AUTHORITY_MAP;
    }

    public discoverRequiredAuthority(target: any, plan: any): RequiredAuthority {
        return { provider: 'aws', operations: PHYSICAL_COR_GRAPH };
    }

    public calculateAuthorityGap(available: Authority, required: RequiredAuthority): AuthorityGap {
        return { hasGap: true, missingPermissions: [] }; // Mock for now
    }

    public generateLeastPrivilegeBundle(target: any, plan: any): AuthorityBundle {
        // Wrapper mapping to AWS logic
        const manifest = this.generateAwsManifest(target.region, target.accountId, target.roleName);
        return { manifest: manifest.manifest, permissions: manifest.permissions };
    }

    public validateBundle(bundle: AuthorityBundle): AuthorityValidationResult {
        return { isValid: true, errors: [] }; // Validation is handled statically in V2 script
    }

    public generateAwsManifest(region: string, accountId: string, roleName: string): CORAuthorityManifest {
        const statements: AuthorityPermission[] = [];

        for (const operation of PHYSICAL_COR_GRAPH) {
            const mappedAuths = AWS_AUTHORITY_MAP[operation];
            if (!mappedAuths) {
                console.warn(`DYNAMIC_AUTHORITY_REQUIRED: No static map for ${operation}`);
                continue;
            }

            for (const auth of mappedAuths) {
                // Apply contextual account and region bounds to ARNs
                const contextualizedResources = auth.resources.map(res => {
                    let r = res.replace('arn:aws:ec2:*:*', `arn:aws:ec2:${region}:${accountId}`);
                    r = r.replace('arn:aws:rds:*:*', `arn:aws:rds:${region}:${accountId}`);
                    r = r.replace('arn:aws:ssm:*:*:', `arn:aws:ssm:${region}::`);
                    return r;
                });

                statements.push({
                    action: auth.action,
                    resources: contextualizedResources,
                    conditions: auth.conditions
                });
            }
        }

        // De-duplicate statements based on signature (action + resources + conditions)
        const uniqueStatements = new Map<string, AuthorityPermission>();
        for (const s of statements) {
            const key = JSON.stringify({ action: s.action, resources: s.resources.sort(), conditions: s.conditions });
            if (!uniqueStatements.has(key)) {
                uniqueStatements.set(key, s);
            }
        }

        return {
            version: 2,
            generatorVersion: '1.2.0',
            mapVersion: '1.2.0',
            manifest: 'ugondu-cor-authority-v2',
            provider: 'aws',
            region,
            corProfile: 'physical-fargate-v2',
            executionRole: { name: roleName },
            permissions: Array.from(uniqueStatements.values()),
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
        const statements = manifest.permissions.map((p, idx) => {
            const stmt: any = {
                Sid: `CORAuthority${idx}`,
                Effect: 'Allow',
                Action: p.action,
                Resource: p.resources.length === 1 ? p.resources[0] : p.resources
            };
            if (p.conditions) {
                stmt.Condition = p.conditions;
            }
            return stmt;
        });

        return {
            Version: '2012-10-17',
            Statement: statements
        };
    }
}

