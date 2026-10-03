/******************************************************************************
 * Project        : Ugondu
 * Module         : move/cutover
 * File           : quiescence.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
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
import { __t } from '../../../../shared/i18n';

import { ITrafficAdapter, TrafficStatus } from './traffic-authority';

/**
 * @class QuiescenceManager
 * @description Corporate Governed class implementation for QuiescenceManager
 * @classification ENTERPRISE
 */
export class QuiescenceManager {
    /**
     * Drains all provided traffic adapters and awaits their quiescence.
     * @param adapters List of adapters to drain
     * @param timeoutMs Maximum time to wait for drain completion
     */
    public async achieveQuiescence(adapters: ITrafficAdapter[], timeoutMs: number): Promise<void> {
        if (!adapters || adapters.length === 0) {
            throw new Error(__t('messages.error.no_traffic_adapters_provided_for_quiescence'));
        }

        const drainPromises = adapters.map(async (adapter) => {
            try {
                await adapter.drain(timeoutMs);
                
                // Verify the status is actually quiesced
                const status = await adapter.status();
                if (status !== TrafficStatus.QUIESCED) {
                    throw new Error(__t('messages.error.adapter_failed_to_reach_quiesced_state_curren', { 'adapter_id': adapter.id, 'status': status }));
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message: __t('ui.responses.unknown_error');
                throw new Error(__t('messages.error.failed_to_drain_adapter', { 'adapter_id': adapter.id, 'errorMessage': errorMessage }));
            }
        });

        await Promise.all(drainPromises);
    }
}
