/******************************************************************************
 * Project        : Ugondu
 * Module         : Passport Compiler & Evidence
 * File           : aggregator.ts
 * Version        : 1.0.0
 * Author         : Antigravity Autonomous Engineer
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
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
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/
import { EvidenceChain } from '../evidence/chain';
import { ApplicabilityAnalyzer, ApplicabilityContext } from './applicability';
import { ConsistencyChecker, DependencyManifest } from './consistency';
import { FreshnessValidator, FreshnessConfig } from './freshness';

export interface AggregationRequest {
    context: ApplicabilityContext;
    manifests: DependencyManifest[];
    freshnessConfig: FreshnessConfig;
}

export class EvidenceAggregator {
    public aggregate(chain: EvidenceChain, request: AggregationRequest): void {
        if (!chain.verify()) {
            throw new Error("Evidence chain is invalid");
        }
        
        if (!ConsistencyChecker.checkVersions(request.manifests)) {
            throw new Error("Dependency consistency check failed");
        }
        
        const timestamps = chain.getChain().map(link => link.timestamp);
        if (!FreshnessValidator.validateCollection(timestamps, request.freshnessConfig)) {
            throw new Error("Evidence is stale according to freshness configuration");
        }
        
        chain.append('aggregation', 'AGGREGATION_COMPLETE', {
            operation: request.context.operation,
            environment: request.context.targetEnvironment
        });
    }
}
