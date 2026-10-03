/******************************************************************************
 * Project        : Ugondu
 * Module         : Passport Compiler & Evidence
 * File           : compiler.ts
 * Version        : 1.0.0
 * Author         : Antigravity Autonomous Engineer
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
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
import { EvidenceAggregator, AggregationRequest } from './aggregator';
import { TwinBinder, TwinState } from './twin-binder';
import { IntentBinder, DeploymentIntent } from './intent-binder';
import { AssuranceBinder, AssuranceReport } from './assurance-binder';
import { PolicyBinder, PolicyEvaluation } from './policy-binder';

/**
 * @interface CompilePassportRequest
 * @description Corporate Governed interface implementation for CompilePassportRequest
 * @classification ENTERPRISE
 */
export interface CompilePassportRequest {
    intent: DeploymentIntent;
    twinState: TwinState;
    assuranceReports: AssuranceReport[];
    policyEvaluations: PolicyEvaluation[];
    aggregationRequest: AggregationRequest;
}

/**
 * @interface DeliveryPassport
 * @description Corporate Governed interface implementation for DeliveryPassport
 * @classification ENTERPRISE
 */
export interface DeliveryPassport {
    id: string;
    intentId: string;
    compiledAt: number;
    evidence: any[];
    isValid: boolean;
}

/**
 * @class PassportCompiler
 * @description Corporate Governed class implementation for PassportCompiler
 * @classification ENTERPRISE
 */
export class PassportCompiler {
    private twinBinder = new TwinBinder();
    private intentBinder = new IntentBinder();
    private assuranceBinder = new AssuranceBinder();
    private policyBinder = new PolicyBinder();
    private aggregator = new EvidenceAggregator();

    public compile(request: CompilePassportRequest): DeliveryPassport {
        const chain = new EvidenceChain();
        
        this.intentBinder.bindIntent(chain, request.intent);
        this.twinBinder.bindTwinState(chain, request.twinState);
        
        for (const report of request.assuranceReports) {
            this.assuranceBinder.bindAssurance(chain, report);
        }
        
        for (const evaluation of request.policyEvaluations) {
            this.policyBinder.bindPolicyEvaluation(chain, evaluation);
        }
        
        this.aggregator.aggregate(chain, request.aggregationRequest);
        
        return {
            id: `passport-${Date.now()}`,
            intentId: request.intent.intentId,
            compiledAt: Date.now(),
            evidence: chain.getChain(),
            isValid: chain.verify()
        };
    }
}
