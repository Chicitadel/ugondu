/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / Fabric / Provider Rejection Tests
 * File           : provider-rejection.spec.ts
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

import { DirectAdminAdapter } from '../providers/directadmin';
import { DirectAdminLiveAdapter } from '../../deise/engine/adapters/directadmin/directadmin-live-adapter';
import { CPanelLiveAdapter } from '../../deise/engine/adapters/cpanel/cpanel-live-adapter';

describe('Provider Fabric Fail-Closed Rejection Invariants (F-005 / COR-009)', () => {
    it('rejects DirectAdminAdapter mutations fail-closed when no underlying native client is configured', async () => {
        const unconfigured = new DirectAdminAdapter();
        await expect(unconfigured.provisionInstance({ instanceName: 'web', osImage: 'php-8.3', cpuCores: 1, memoryMb: 1024 } as any, {})).rejects.toThrow();
        await expect(unconfigured.terminateInstance('inst-1')).rejects.toThrow();
        await expect(unconfigured.getInstanceStatus('inst-1')).rejects.toThrow();
        await expect(unconfigured.provisionDatabase({ name: 'db1', engine: 'mysql' } as any, {})).rejects.toThrow();
        await expect(unconfigured.deprovisionDatabase('db1')).rejects.toThrow();
        await expect(unconfigured.provisionStorage({ name: 'st1' } as any, {})).rejects.toThrow();
        await expect(unconfigured.deprovisionStorage('st1')).rejects.toThrow();
    });

    it('rejects DirectAdminAdapter status lookup when probed client returns unverified or mismatched instance ID', async () => {
        const badClient = {
            createHostedApp: async () => ({ id: 'inst-1', state: 'running' }),
            removeHostedApp: async () => {},
            getInstanceStatus: async () => ({ id: 'mismatched-id', state: 'running' as const, health: 'healthy' as const }),
            createDatabase: async () => ({ id: 'db-1', state: 'ready' }),
            removeDatabase: async () => {},
            createAccountFILE: async () => ({ id: 'f-1', state: 'ready' }),
            createSnapshot: async () => 'snap-1',
            removeAccountFILE: async () => {},
        };
        const adapter = new DirectAdminAdapter(badClient);
        await expect(adapter.getInstanceStatus('inst-1')).rejects.toThrow();
        await expect(adapter.getInstanceStatus('')).rejects.toThrow();
    });

    it('rejects unimplemented DEISE live recovery methods on DirectAdminLiveAdapter and CPanelLiveAdapter fail-closed', async () => {
        const daLive = new DirectAdminLiveAdapter();
        await expect(daLive.identify({} as any, {} as any)).rejects.toThrow();
        await expect(daLive.executeAtomicRecovery({} as any, {} as any)).rejects.toThrow('UNIMPLEMENTED');

        const cpLive = new CPanelLiveAdapter();
        await expect(cpLive.identify({} as any, {} as any)).rejects.toThrow();
        await expect(cpLive.executeAtomicRecovery({} as any, {} as any)).rejects.toThrow('UNIMPLEMENTED');
    });
});
