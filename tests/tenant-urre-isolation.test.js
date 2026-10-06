/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Integration
 * File           : tenant-urre-isolation.test.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Classification : COMMERCIAL | INTERNAL
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');

async function runTests() {
    console.log('[en] ══════════════════════════════════════════════════════');
    console.log('[en] Ugondu Test Suite — Tenant URRE Isolation Guard');
    console.log('[en] ══════════════════════════════════════════════════════');

    // Due to ES modules or TypeScript, we might need to load compiled JS or use ts-node.
    // or load the compiled dist files. Since tests usually run via a runner that handles TS or 
    // run against dist/, we'll require the dist file. If dist doesn't exist, we fallback.
    
    let Executor;
    let TenantIsolationError;
    try {
        const executorModule = require('../server/engine-core/dist/urre/executor');
        Executor = executorModule.Executor;
        const isolationGuardModule = require('../server/engine-core/dist/tenant/integration/twin-isolation-guard');
        TenantIsolationError = isolationGuardModule.TenantIsolationError;
    } catch (e) {
        // Fallback for ts-node environment
        try {
            require('ts-node/register');
            const executorModule = require('../server/engine-core/src/urre/executor');
            Executor = executorModule.Executor;
            const isolationGuardModule = require('../server/engine-core/src/tenant/integration/twin-isolation-guard');
            TenantIsolationError = isolationGuardModule.TenantIsolationError;
        } catch (err) {
            console.error('[en] Could not load modules for testing:', err.message);
            process.exit(1);
        }
    }

        runTask: async () => ({ status: 'SUCCESS' })
    };

    let passed = 0;
    let failed = 0;

    // Test 1: Call Executor with valid same-tenant SecurityContext → succeeds
    try {
        const validEnvelope = {
            signature: 'SIG:123',
            contextId: 'ctx_1',
            securityContext: {
                tenantId: 'tenant_123',
                tenant: { id: 'tenant_123', organizationId: 'org_1' },
                organizationId: 'org_1'
            }
        };
        const task = { contextId: 'ctx_1' };
        
        await executor.execute(validEnvelope, task);
        console.log('[en] ✓ PASS: Valid same-tenant SecurityContext succeeds');
        passed++;
    } catch (e) {
        console.error('[en] ✗ FAIL: Valid same-tenant SecurityContext —', e.message);
        failed++;
    }

    // Test 2: Call Executor with mismatched tenantId → throws/rejects immediately
    try {
        const mismatchEnvelope = {
            signature: 'SIG:123',
            contextId: 'ctx_1',
            securityContext: {
                tenantId: 'tenant_123',
                tenant: { id: 'tenant_999' }
            }
        };
        const task = { contextId: 'ctx_1' };
        
        await executor.execute(mismatchEnvelope, task);
        console.error('[en] ✗ FAIL: Mismatched tenantId should have thrown');
        failed++;
    } catch (e) {
        if (e.name === 'TenantIsolationError' || e.message.includes('match')) {
            console.log('[en] ✓ PASS: Mismatched tenantId throws immediately');
            passed++;
        } else {
            console.error('[en] ✗ FAIL: Mismatched tenantId threw unexpected error:', e.message);
            failed++;
        }
    }

    // Test 3: Call Executor with null SecurityContext → throws/rejects
    try {
        const nullContextEnvelope = {
            signature: 'SIG:123',
            contextId: 'ctx_1',
            securityContext: null
        };
        const task = { contextId: 'ctx_1' };
        
        await executor.execute(nullContextEnvelope, task);
        console.error('[en] ✗ FAIL: Null SecurityContext should have thrown');
        failed++;
    } catch (e) {
        if (e.name === 'TenantIsolationError' || e.message.includes('null')) {
            console.log('[en] ✓ PASS: Null SecurityContext throws immediately');
            passed++;
        } else {
            console.error('[en] ✗ FAIL: Null SecurityContext threw unexpected error:', e.message);
            failed++;
        }
    }

    console.log('[en] ══════════════════════════════════════════════════════');
    console.log(`[en] Results: ${passed} passed, ${failed} failed`);
    console.log('[en] ══════════════════════════════════════════════════════');

    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('[en] Fatal test suite error:', err);
    process.exit(1);
});
