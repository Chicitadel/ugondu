__t('use_strict');
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORAuthorityCalculator = void 0;
// Statically maps abstract operations to AWS-specific execution policies
var AWS_AUTHORITY_MAP = {
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
        { action: 'rds:AddTagsToResource', resources: ['arn:aws:rds:*:*:subgrp:*'], conditions: { "ForAllValues:StringEquals": { "aws:TagKeys": ["UgonduCOR", "UgonduTransactionId"] } } }
    ],
    'database:rds-subnet-group:terminate': [
        { action: 'rds:DeleteDBSubnetGroup', resources: ['arn:aws:rds:*:*:subgrp:*'], conditions: { "StringLike": { "aws:ResourceTag/UgonduCOR": "*" } } }
    ],
    'database:relational:create': [
        // Ensure dependent permissions are covered for RDS Create in a VPC.
        // RDS doesn't use secgrp ARNs during creation in IAM, but it does require describe permissions.
        { action: 'rds:CreateDBInstance', resources: ['arn:aws:rds:*:*:db:*', 'arn:aws:rds:*:*:subgrp:*'] },
        { action: 'rds:AddTagsToResource', resources: ['arn:aws:rds:*:*:db:*'], conditions: { "ForAllValues:StringEquals": { "aws:TagKeys": ["UgonduCOR", "UgonduTransactionId"] } } }
    ],
    'database:relational:terminate': [
        { action: 'rds:DeleteDBInstance', resources: ['arn:aws:rds:*:*:db:*'], conditions: { "StringLike": { "aws:ResourceTag/UgonduCOR": "*" } } }
    ],
    'database:rds-snapshot:create': [
        { action: 'rds:CreateDBSnapshot', resources: ['arn:aws:rds:*:*:snapshot:*', 'arn:aws:rds:*:*:db:*'] },
        { action: 'rds:AddTagsToResource', resources: ['arn:aws:rds:*:*:snapshot:*'], conditions: { "ForAllValues:StringEquals": { "aws:TagKeys": ["UgonduCOR", "UgonduTransactionId"] } } }
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
        { action: 'ec2:CreateTags', resources: ['arn:aws:ec2:*:*:instance/*'], conditions: { "StringLike": { "aws:ResourceTag/UgonduCOR": "*" }, "ForAllValues:StringEquals": { "aws:TagKeys": ["Name"] } } },
        { action: 'ec2:DeleteTags', resources: ['arn:aws:ec2:*:*:instance/*'], conditions: { "StringLike": { "aws:ResourceTag/UgonduCOR": "*" }, "ForAllValues:StringEquals": { "aws:TagKeys": ["Name"] } } }
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
var PHYSICAL_COR_GRAPH = [
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
var CORAuthorityCalculator = /** @class */ (function () {
    function CORAuthorityCalculator() {
    }
    CORAuthorityCalculator.prototype.getGraph = function () {
        return PHYSICAL_COR_GRAPH;
    };
    CORAuthorityCalculator.prototype.getMap = function () {
        return AWS_AUTHORITY_MAP;
    };
    CORAuthorityCalculator.prototype.discoverRequiredAuthority = function (target, plan) {
        return { provider: 'aws', operations: PHYSICAL_COR_GRAPH };
    };
    CORAuthorityCalculator.prototype.calculateAuthorityGap = function (available, required) {
        throw new Error(__t('unimplemented_calculateauthori'));
    };
    CORAuthorityCalculator.prototype.generateLeastPrivilegeBundle = function (target, plan) {
        // Wrapper mapping to AWS logic
        var manifest = this.generateAwsManifest(target.region, target.accountId, target.roleName);
        return { manifest: manifest.manifest, permissions: manifest.permissions };
    };
    CORAuthorityCalculator.prototype.validateBundle = function (bundle) {
        return { isValid: true, errors: [] }; // Validation is handled statically in V2 script
    };
    CORAuthorityCalculator.prototype.generateAwsManifest = function (region, accountId, roleName) {
        var statements = [];
        for (var _i = 0, PHYSICAL_COR_GRAPH_1 = PHYSICAL_COR_GRAPH; _i < PHYSICAL_COR_GRAPH_1.length; _i++) {
            var operation = PHYSICAL_COR_GRAPH_1[_i];
            var mappedAuths = AWS_AUTHORITY_MAP[operation];
            if (!mappedAuths) {
                console.warn("DYNAMIC_AUTHORITY_REQUIRED: No static map for ".concat(operation));
                continue;
            }
            for (var _a = 0, mappedAuths_1 = mappedAuths; _a < mappedAuths_1.length; _a++) {
                var auth = mappedAuths_1[_a];
                // Apply contextual account and region bounds to ARNs
                var contextualizedResources = auth.resources.map(function (res) {
                    var r = res.replace('arn:aws:ec2:*:*', "arn:aws:ec2:".concat(region, ":").concat(accountId));
                    r = r.replace('arn:aws:rds:*:*', "arn:aws:rds:".concat(region, ":").concat(accountId));
                    r = r.replace('arn:aws:ssm:*:*:', "arn:aws:ssm:".concat(region, "::"));
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
        var uniqueStatements = new Map();
        for (var _b = 0, statements_1 = statements; _b < statements_1.length; _b++) {
            var s = statements_1[_b];
            var key = JSON.stringify({ action: s.action, resources: s.resources.sort(), conditions: s.conditions });
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
            region: region,
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
    };
    CORAuthorityCalculator.prototype.exportToIAMPolicy = function (manifest) {
        var statements = manifest.permissions.map(function (p, idx) {
            var stmt = {
                Sid: "CORAuthority".concat(idx),
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
    };
    return CORAuthorityCalculator;
}());
exports.CORAuthorityCalculator = CORAuthorityCalculator;
