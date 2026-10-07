/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Policy & Fleet Management
 * File           : policy.ts
 * Version        : 2.0.0
 * Author         : Enterprise Policy & Fleet Orchestration Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import crypto from 'crypto';
import { __t } from '../i18n';

export interface ApprovalRequest {
    requestId: string;
    requesterPrincipalId: string;
    environmentId: string;
    riskScore: number;
    planHash: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    approverPrincipalId?: string;
    approvedAt?: number;
}

export interface FleetDeploymentSpec {
    fleetId: string;
    totalTargets: number;
    maxSurge: number;
    maxUnavailable: number;
    strategy: 'ROLLING' | 'CANARY' | 'BLUE_GREEN';
}

export interface FleetBatchPlan {
    batches: Array<{
        batchIndex: number;
        targetCount: number;
        requireHealthCheckBeforeNext: boolean;
    }>;
}

export class EnterprisePolicyEngine {
    public static createApprovalRequest(
        requesterPrincipalId: string,
        environmentId: string,
        riskScore: number,
        planHash: string
    ): ApprovalRequest {
        return {
            requestId: `appr_${crypto.randomBytes(8).toString('hex')}`,
            requesterPrincipalId,
            environmentId,
            riskScore,
            planHash,
            status: 'PENDING'
        };
    }

    public static evaluateDualApproval(
        request: ApprovalRequest,
        approverPrincipalId: string,
        approverRole: string
    ): boolean {
        // Enforce 4-Eyes Principle: Requester cannot approve their own deployment
        if (request.requesterPrincipalId === approverPrincipalId) {
            return false;
        }

        // Must be ADMIN or OPERATOR to approve
        if (approverRole !== 'ADMIN' && approverRole !== 'OPERATOR') {
            return false;
        }

        request.status = 'APPROVED';
        request.approverPrincipalId = approverPrincipalId;
        request.approvedAt = Date.now();
        return true;
    }

    public static calculateFleetRollingBatches(spec: FleetDeploymentSpec): FleetBatchPlan {
        const batchSize = Math.max(1, spec.maxUnavailable);
        const batches: FleetBatchPlan['batches'] = [];
        let remaining = spec.totalTargets;
        let index = 0;

        while (remaining > 0) {
            const count = Math.min(batchSize, remaining);
            batches.push({
                batchIndex: index++,
                targetCount: count,
                requireHealthCheckBeforeNext: true
            });
            remaining -= count;
        }

        return { batches };
    }
}
