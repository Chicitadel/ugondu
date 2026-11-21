/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Fabric / Provider Contract Tests
 * File           : provider-contract.spec.ts
 * Version        : 3.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-22
 * Last Modified  : 2026-10-22
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { DirectAdminContract, DirectAdminAdapter } from '../providers/directadmin';
import { CpanelContract, CpanelAdapter } from '../providers/cpanel';
import { KubernetesContract } from '../providers/kubernetes';
import { AwsContract } from '../providers/aws';
import { LinuxContract } from '../providers/linux';

describe('Provider Fabric Capability Contracts (F-004 / F-005)', () => {
    it('declares explicit NATIVE, CONDITIONAL, or UNSUPPORTED statuses per resource kind across all fabric providers', () => {
        const contracts = [AwsContract, KubernetesContract, LinuxContract, CpanelContract, DirectAdminContract];
        for (const contract of contracts) {
            expect(typeof contract.provider).toBe('string');
            expect(contract.provider.length).toBeGreaterThan(0);
            for (const kind of ['COMPUTE', 'NETWORK', 'DATABASE', 'STORAGE'] as const) {
                const spec = contract.kinds[kind];
                expect(spec).toBeDefined();
                expect(['NATIVE', 'CONDITIONAL', 'UNSUPPORTED']).toContain(spec.status);
                if (spec.status === 'UNSUPPORTED') {
                    expect(spec.modes).toEqual([]);
                    expect(typeof spec.reasonKey).toBe('string');
                }
            }
        }
    });

    it('enforces DirectAdmin Honest UNKNOWN discovery and never fabricates healthy status without verified probes', () => {
        const adapter = new DirectAdminAdapter();
        const caps = adapter.discoverCapabilities({});
        expect(caps.php).toBe('UNKNOWN');
        expect(caps.database).toBe('UNKNOWN');
        expect(caps.kubernetes).toBe('UNSUPPORTED');

        const twin = adapter.discoverEnvironmentTwin({});
        expect(twin.health.status).toBe('UNKNOWN');
        expect(twin.costs.status).toBe('UNOBSERVED');
    });

    it('reports unknown/unverified instance state in CpanelAdapter when instance has not been provisioned or verified', async () => {
        const stubWhm = {
            createHostedApp: async () => ({ id: 'app-1', state: 'running' as const }),
            removeHostedApp: async () => {},
            createDatabase: async () => ({ id: 'db-1', endpoint: 'localhost' }),
            removeDatabase: async () => {},
            createAccountFilesystem: async () => ({ id: 'fs-1', endpoint: '/home/app' }),
            removeAccountFilesystem: async () => {},
            createSnapshot: async () => 'snap-1',
        };
        const adapter = new CpanelAdapter(stubWhm);
        const unverified = await adapter.getInstanceStatus('non-existent-app');
        expect(unverified.health).not.toBe('healthy');
    });
});
