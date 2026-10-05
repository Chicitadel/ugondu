/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Provider Fabric — Capability Contract (declarations and registration)
 * File           : provider-contract.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { FabricRegistry } from '../registry';
import { CANONICAL_CONTRACTS } from '../contract/CanonicalContracts';
import { assertContractConsistent, NODE_KINDS, ProviderRegistrationError } from '../contract/ProviderContract';
import { canonicalFabric, nativeContract } from './support/fakeCloud';
// @ts-ignore
import { __t } from '../../../../shared/i18n';

declare var describe: any, it: any, expect: any;

const C = (key: string, params?: Record<string, string | number>): string => __t(`fabric.contract.${key}`, params);
const stub: any = {};
const all: any = { COMPUTE: stub, NETWORK: stub, DATABASE: stub, STORAGE: stub };

/** The frozen matrix of ugondu_provider_fabric_blueprint_v2, written out independently of the implementation. */
const MATRIX: Record<string, { kinds: Record<string, [string, string[]]>; engines: string[]; classes: string[]; publicClasses: string[] }> = {
  aws: { kinds: { COMPUTE: ['NATIVE', ['INSTANCE']], NETWORK: ['NATIVE', ['VPC']], DATABASE: ['NATIVE', []], STORAGE: ['NATIVE', []] }, engines: ['postgres', 'mysql'], classes: ['OBJECT'], publicClasses: ['OBJECT'] },
  kubernetes: { kinds: { COMPUTE: ['NATIVE', ['DEPLOYMENT', 'STATEFULSET']], NETWORK: ['CONDITIONAL', ['NETWORK_POLICY']], DATABASE: ['UNSUPPORTED', []], STORAGE: ['CONDITIONAL', ['PVC']] }, engines: [], classes: ['FILE', 'BLOCK'], publicClasses: [] },
  linux: { kinds: { COMPUTE: ['NATIVE', ['SYSTEMD', 'CONTAINER']], NETWORK: ['CONDITIONAL', ['EXISTING', 'NETWORKMANAGER', 'SYSTEMD_NETWORKD', 'NETPLAN']], DATABASE: ['UNSUPPORTED', []], STORAGE: ['NATIVE', ['DIRECTORY']] }, engines: [], classes: ['FILE'], publicClasses: [] },
  cpanel: { kinds: { COMPUTE: ['CONDITIONAL', ['HOSTED_APP']], NETWORK: ['UNSUPPORTED', []], DATABASE: ['CONDITIONAL', ['MYSQL']], STORAGE: ['CONDITIONAL', ['ACCOUNT_FILESYSTEM']] }, engines: ['mysql'], classes: ['FILE'], publicClasses: [] },
};

describe(__t('provider_capability_contract_t'), () => {
  it(__t('declares_exactly_the_four_prov'), () => {
    expect(Object.keys(CANONICAL_CONTRACTS).sort()).toEqual(['aws', 'cpanel', 'kubernetes', 'linux']);
  });

  for (const [provider, expected] of Object.entries(MATRIX)) {
    it(`${provider} declares every kind with the status, modes, engines and classes of the blueprint`, () => {
      const contract = CANONICAL_CONTRACTS[provider]!;
      expect(contract.provider).toBe(provider);
      expect(Object.keys(contract.kinds).sort()).toEqual([...NODE_KINDS].sort());
      for (const kind of NODE_KINDS) {
        expect([contract.kinds[kind].status, [...contract.kinds[kind].modes]]).toEqual(expected.kinds[kind]);
      }
      expect([...contract.databaseEngines]).toEqual(expected.engines);
      expect([...contract.storageClasses]).toEqual(expected.classes);
      expect([...contract.publicStorageClasses]).toEqual(expected.publicClasses);
    });
  }

  it(__t('explains_every_unsupported_or_'), () => {
    for (const contract of Object.values(CANONICAL_CONTRACTS)) {
      for (const kind of NODE_KINDS) {
        const declared = contract.kinds[kind];
        if (declared.status === 'NATIVE') continue;
        expect(declared.reasonKey).toBeDefined();
        expect(__t(declared.reasonKey as string)).not.toBe(declared.reasonKey);
        expect((declared.alternativeKeys ?? []).length).toBeGreaterThanOrEqual(2);
        for (const key of declared.alternativeKeys ?? []) expect(__t(key)).not.toBe(key);
      }
    }
  });

  it(__t('only_aws_serves_public_storage'), () => {
    const publicCapable = Object.values(CANONICAL_CONTRACTS).filter((c) => c.publicStorageClasses.length > 0);
    expect(publicCapable.map((c) => c.provider)).toEqual(['aws']);
    expect(publicCapable[0]!.publicStorageClasses).toEqual(['OBJECT']);
  });

  it('every real provider supports rollback, idempotency and delete; none claims import or update yet', () => {
    for (const c of Object.values(CANONICAL_CONTRACTS)) {
      expect([c.supportsRollback, c.supportsIdempotency, c.supportsDelete, c.supportsImport, c.supportsUpdate]).toEqual([true, true, true, false, false]);
    }
  });

  it(__t('only_a_provider_that_can_dry_r'), () => {
    expect(Object.values(CANONICAL_CONTRACTS).map((c) => [c.provider, c.supportsDryRun])).toEqual([['aws', true], ['kubernetes', true], ['linux', true], ['cpanel', false]]);
  });
});

describe(__t('provider_capability_contract_r'), () => {
  it(__t('accepts_a_consistent_declarati'), () => {
    const registry = new FabricRegistry();
    registry.registerProvider(nativeContract('aws'), all);
    expect(registry.isRegistered('aws')).toBe(true);
    expect(registry.isRegistered('gcp')).toBe(false);
    expect(registry.contractOf('aws').provider).toBe('aws');
  });

  it(__t('registers_each_real_provider_w'), () => {
    const { registry } = canonicalFabric();
    expect(() => registry.resolveDatabase('aws')).not.toThrow();
    expect(() => registry.resolveDatabase('cpanel')).not.toThrow();
    for (const [provider, kind, resolve] of [
      ['kubernetes', 'DATABASE', () => registry.resolveDatabase('kubernetes')], ['linux', 'DATABASE', () => registry.resolveDatabase('linux')], ['cpanel', 'NETWORK', () => registry.resolveNetwork('cpanel')],
    ] as Array<[string, string, () => unknown]>) {
      expect(resolve).toThrow(C('capability_unsupported', { provider, kind }));
    }
  });

  it(__t('tells_apart_an_unregistered_pr'), () => {
    const { registry } = canonicalFabric();
    expect(() => registry.contractOf('gcp')).toThrow(C('provider_not_registered', { provider: 'gcp' }));
    expect(() => registry.resolveCompute('gcp')).toThrow(C('provider_not_registered', { provider: 'gcp' }));
  });

  it(__t('refuses_to_register_the_same_p'), () => {
    const registry = new FabricRegistry();
    registry.registerProvider(nativeContract('aws'), all);
    expect(() => registry.registerProvider(nativeContract('aws'), all)).toThrow(C('provider_already_registered', { provider: 'aws' }));
  });

  it(__t('refuses_a_declaration_that_omi'), () => {
    const contract: any = nativeContract('aws');
    delete contract.kinds.NETWORK;
    expect(() => assertContractConsistent(contract, all)).toThrow(C('kind_undeclared', { provider: 'aws', kind: 'NETWORK' }));
    const error = (() => { try { assertContractConsistent(contract, all); } catch (e) { return e; } })();
    expect(error instanceof ProviderRegistrationError).toBe(true);
    expect((error as Error).name).toBe('ProviderRegistrationError');
  });

  it(__t('refuses_an_adapter_for_a_kind_'), () => {
    const unsupported: any = nativeContract('x');
    unsupported.kinds.DATABASE = { status: 'UNSUPPORTED', modes: [] };
    expect(() => assertContractConsistent(unsupported, all)).toThrow(C('adapter_for_unsupported', { provider: 'x', kind: 'DATABASE' }));
    expect(() => assertContractConsistent(unsupported, { COMPUTE: stub, NETWORK: stub, STORAGE: stub })).not.toThrow();
    expect(() => assertContractConsistent(nativeContract('x'), { COMPUTE: stub, NETWORK: stub, STORAGE: stub })).toThrow(C('adapter_missing', { provider: 'x', kind: 'DATABASE' }));
    const conditional: any = nativeContract('x');
    conditional.kinds.STORAGE = { status: 'CONDITIONAL', modes: ['X'] };
    expect(() => assertContractConsistent(conditional, { COMPUTE: stub, NETWORK: stub, DATABASE: stub })).toThrow(C('adapter_missing', { provider: 'x', kind: 'STORAGE' }));
  });

  it(__t('refuses_a_conditional_kind_tha'), () => {
    const conditional: any = nativeContract('x');
    conditional.kinds.NETWORK = { status: 'CONDITIONAL', modes: [] };
    expect(() => assertContractConsistent(conditional, all)).toThrow(C('conditional_without_modes', { provider: 'x', kind: 'NETWORK' }));
    expect(() => assertContractConsistent({ ...nativeContract('x'), provider: '' }, all)).toThrow(C('provider_name_missing'));
  });

  it(__t('checks_the_kinds_in_a_fixed_or'), () => {
    const contract: any = nativeContract('x');
    contract.kinds.COMPUTE = { status: 'UNSUPPORTED', modes: [] };
    contract.kinds.STORAGE = { status: 'UNSUPPORTED', modes: [] };
    expect(() => assertContractConsistent(contract, all)).toThrow(C('adapter_for_unsupported', { provider: 'x', kind: 'COMPUTE' }));
  });
});
