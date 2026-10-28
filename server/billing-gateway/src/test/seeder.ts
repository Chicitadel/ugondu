/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Billing Gateway — Test Fixture Seeder
 * File           : seeder.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-03
 * Last Modified  : 2026-10-18
 * Classification : INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { tokenStore } from '../db';

export function seedTestTokens(): void {
    tokenStore.registerToken('community_token_123', 'tenant_comm_01', 'community', { status: 'active' });
    tokenStore.registerToken('ugp_demo123', 'tenant_prof_99', 'professional', { status: 'active' });
    tokenStore.registerToken('ugb_biz789', 'tenant_biz_22', 'business', { status: 'active' });
    tokenStore.registerToken('uge_corp456', 'tenant_ent_11', 'enterprise', { status: 'active' });
    tokenStore.registerToken('ugs_sov001', 'tenant_sov_01', 'sovereign', { status: 'active' });
    tokenStore.registerToken('ugp_suspended_001', 'tenant_susp_01', 'professional', {
        status: 'suspended',
        suspendedReason: 'Payment delinquency threshold exceeded',
    });
    tokenStore.registerToken('ugp_expired_001', 'tenant_exp_01', 'professional', {
        status: 'expired',
        expiresAt: '2020-01-01T00:00:00.000Z',
    });
    tokenStore.registerToken('ugp_revoked_001', 'tenant_rev_01', 'professional', {
        status: 'revoked',
        revokedAt: '2026-01-01T00:00:00.000Z',
    });
}
