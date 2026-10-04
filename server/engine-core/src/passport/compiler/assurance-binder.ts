/******************************************************************************
 * Project        : Ugondu
 * Module         : Passport Compiler & Evidence
 * File           : assurance-binder.ts
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

// @ts-ignore
import { __t } from '@ugondu/shared';
import { EvidenceChain } from '../evidence/chain';

/**
 * @interface AssuranceReport
 * @description Corporate Governed interface implementation for AssuranceReport
 * @classification ENTERPRISE
 */
export interface AssuranceReport {
    reportId: string;
    testSuite: string;
    passed: boolean;
    coverage: number;
    timestamp: number;
}

/**
 * @class AssuranceBinder
 * @description Corporate Governed class implementation for AssuranceBinder
 * @classification ENTERPRISE
 */
export class AssuranceBinder {
    public bindAssurance(chain: EvidenceChain, report: AssuranceReport): void {
        if (!report.passed) {
            throw new Error(__t('messages.error.cannot_bind_failing_assurance_report', { 'report_reportId': report.reportId }));
        }
        chain.append(`assurance-${report.reportId}`, 'ASSURANCE_BINDING', report);
    }
}
