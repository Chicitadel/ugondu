/******************************************************************************
 * Project        : Ugondu
 * Module         : Governance
 * File           : adapter.ts
 * Version        : 1.0.0
 * Author         : AWS Governance Adapter Lead
 * Organization   : Corporate
 * Created Date   : 2026-10-05
 * Last Modified  : 2026-10-05
 * Classification : ENTERPRISE
 *
 * Governance:
 * - AI Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Corporate
 * All Rights Reserved.
 ******************************************************************************/

import { ProviderAuthorizationAdapter, PolicyGovernanceEngine } from '../../engine/policy-engine';
import { UniversalPermission, UniversalPolicy } from '../../model/authorization';
import * as crypto from 'crypto';

export class AwsGovernanceAdapter implements ProviderAuthorizationAdapter {
    providerIdentifier = 'aws';

    private mapActionToIam(action: string): string[] {
        // POL-GOV-001: Explicit translation of Ugondu operation to provider authorization verb
        switch (action) {
            case 'CREATE_VPC':
            case 'network:vpc:create':
                return ['ec2:CreateVpc', 'ec2:CreateTags'];
            case 'TERMINATE_VPC':
            case 'network:vpc:delete':
                return ['ec2:DeleteVpc'];
            case 'CREATE_SUBNET':
            case 'network:subnet:create':
                return ['ec2:CreateSubnet', 'ec2:CreateTags'];
            case 'CREATE_SECURITY_GROUP':
            case 'network:security-group:create':
                return ['ec2:CreateSecurityGroup', 'ec2:CreateTags'];
            case 'CREATE_EC2':
            case 'compute:instance:create':
                return ['ec2:RunInstances', 'ec2:CreateTags'];
            case 'TERMINATE_EC2':
            case 'compute:instance:terminate':
                return ['ec2:TerminateInstances'];
            case 'container:registry:create':
                return ['ecr:CreateRepository', 'ecr:PutImage', 'ecr:GetAuthorizationToken'];
            case 'container:task-definition:create':
                return ['ecs:RegisterTaskDefinition'];
            case 'container:service:create':
                return ['ecs:CreateService'];
            default:
                // If it looks like an IAM verb, pass it through, otherwise fail closed.
                if (action.includes(':')) {
                    return [action];
                }
                throw new Error(`POL-GOV-001 Violation: Unmapped canonical action '${action}' cannot be translated to AWS IAM verb.`);
        }
    }

    translateIntent(intent: UniversalPermission[]): any {
        // Translates to AWS IAM Policy Document format safely (POL-001 Least Privilege)
        const statements = intent.map(permission => {
            const iamActions = this.mapActionToIam(permission.action);
            const statement: any = {
                Effect: 'Allow',
                Action: iamActions.length === 1 ? iamActions[0] : iamActions,
                Resource: permission.resource
            };

            if (permission.conditions && Object.keys(permission.conditions).length > 0) {
                statement.Condition = permission.conditions;
            }

            return statement;
        });

        return {
            Version: '2012-10-17',
            Statement: statements
        };
    }

    synthesizePolicy(intent: UniversalPermission[]): UniversalPolicy {
        const canonicalizer = require('../../canonicalization').CanonicalPolicySerializer;
        const iamPolicy = this.translateIntent(intent);
        
        const policyHash = canonicalizer.hash(iamPolicy);
        return {
            id: `aws-synth-${policyHash.substring(0, 8)}`,
            name: 'SynthesizedAWSIAMPolicy',
            description: typeof __t !== 'undefined' ? __t('synthesized_aws_policy_adherin') : 'Synthesized AWS IAM Policy',
            permissions: intent,
            providerResponseHash: policyHash
        };
    }

    verifyCapability(intent: UniversalPermission[]): boolean {
        for (const permission of intent) {
            // Enforce POL-014 (Security Boundary Preservation)
            // Reject exact intent mapping if it results in over-privileging or unsupported conditions.
            if (permission.action === '*' || permission.resource === '*') {
                return false;
            }

            if (permission.conditions) {
                // Return false if intent cannot be mapped exactly without over-privileging
                if ('unsupported_boundary' in permission.conditions) {
                    return false;
                }
            }
        }

        return true;
    }
}

export function registerAwsAdapter(engine: PolicyGovernanceEngine) {
    const adapter = new AwsGovernanceAdapter();
    engine.registerAdapter(adapter);
}
