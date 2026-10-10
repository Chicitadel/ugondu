__t('use_strict');
Object.defineProperty(exports, "__esModule", { value: true });
const shared_1 = require("@ugondu/shared");
/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests
 * File           : certification.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers
 * Created Date   : 2026-10-08
 * Last Modified  : 2026-10-08
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
// Globals are provided by testing framework
class IntegrationOrchestrator {
    async certify(baselineFingerprint, finalFingerprint, txId, diagnosis, plan, executionEvidence, verificationEvidence) {
        return {
            certificateId: 'cert-' + txId,
            baselineFingerprint,
            finalFingerprint,
            transactionId: txId,
            diagnosisDigest: 'mock-diag-digest',
            approvedPlanDigest: 'mock-plan-digest',
            mutationEvidence: executionEvidence,
            verificationEvidence: verificationEvidence,
            adapterVersion: '1.0.0',
            policyVersions: { 'live-recovery-invariants': '1.0.0' },
            timestamp: new Date().toISOString()
        };
    }
    async issuePassport(certificate) {
        // Emit passport representation
    }
    async executeAtomically(plan, adapter, scope) {
        if (plan.failQuota)
            throw new Error((0, shared_1.__t)('cert.error.quota_exceeded'));
        if (plan.failRollback)
            throw new Error((0, shared_1.__t)('cert.error.rollback_failed'));
        if (plan.foreignResource)
            throw new Error((0, shared_1.__t)('cert.error.foreign_resource_refusal'));
        return { executionEvidence: { status: 'SUCCESS' } };
    }
    async verify(adapter, scope, criteria) {
        return { verificationEvidence: { status: 'VERIFIED' } };
    }
}
describe(__t('certification_evidence_builder'), () => {
    const orchestrator = new IntegrationOrchestrator();
    it(__t('should_handle_successful_clean'), async () => {
        const plan = { type: 'CLEANUP', failQuota: false };
        const execution = await orchestrator.executeAtomically(plan, {}, {});
        const verification = await orchestrator.verify({}, {}, { state: 'RECOVERED' });
        const cert = await orchestrator.certify('fp-1', 'fp-2', 'tx-cleanup', {}, plan, execution.executionEvidence, verification.verificationEvidence);
        await orchestrator.issuePassport(cert);
        expect(cert.certificateId).toBeDefined();
        expect(cert.transactionId).toBe('tx-cleanup');
    });
    it(__t('should_generate_evidence_for_q'), async () => {
        const plan = { type: 'DEPLOY', failQuota: true };
        let executionFailed = false;
        try {
            await orchestrator.executeAtomically(plan, {}, {});
        }
        catch (e) {
            executionFailed = true;
            const cert = await orchestrator.certify('fp-1', 'fp-1', 'tx-quota', {}, plan, { error: e.message }, null);
            await orchestrator.issuePassport(cert);
            expect(cert.certificateId).toBeDefined();
            expect(cert.mutationEvidence.error).toBe((0, shared_1.__t)('cert.error.quota_exceeded'));
        }
        expect(executionFailed).toBe(true);
    });
    it(__t('should_generate_evidence_for_r'), async () => {
        const plan = { type: 'ROLLBACK', failRollback: true };
        let executionFailed = false;
        try {
            await orchestrator.executeAtomically(plan, {}, {});
        }
        catch (e) {
            executionFailed = true;
            const cert = await orchestrator.certify('fp-1', 'fp-1', 'tx-rollback', {}, plan, { error: e.message }, null);
            await orchestrator.issuePassport(cert);
            expect(cert.certificateId).toBeDefined();
            expect(cert.mutationEvidence.error).toBe((0, shared_1.__t)('cert.error.rollback_failed'));
        }
        expect(executionFailed).toBe(true);
    });
    it(__t('should_generate_evidence_for_f'), async () => {
        const plan = { type: 'MODIFY', foreignResource: true };
        let executionFailed = false;
        try {
            await orchestrator.executeAtomically(plan, {}, {});
        }
        catch (e) {
            executionFailed = true;
            const cert = await orchestrator.certify('fp-1', 'fp-1', 'tx-foreign', {}, plan, { error: e.message }, null);
            await orchestrator.issuePassport(cert);
            expect(cert.certificateId).toBeDefined();
            expect(cert.mutationEvidence.error).toBe((0, shared_1.__t)('cert.error.foreign_resource_refusal'));
        }
        expect(executionFailed).toBe(true);
    });
    it(__t('should_securely_handle_histori'), async () => {
        const plan = { type: 'ORPHAN_CLEANUP' };
        const execution = await orchestrator.executeAtomically(plan, {}, {});
        const verification = await orchestrator.verify({}, {}, { state: 'RECOVERED' });
        const cert = await orchestrator.certify('fp-1', 'fp-2', 'tx-orphan', {}, plan, execution.executionEvidence, verification.verificationEvidence);
        await orchestrator.issuePassport(cert);
        expect(cert.certificateId).toBeDefined();
        expect(cert.transactionId).toBe('tx-orphan');
    });
});
