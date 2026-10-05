/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Provider Fabric — Preflight rejection (capability, public storage, credentials)
 * File           : provider-rejection.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { ProvisioningEngine, InMemoryProvisioningState } from '../provisioning-engine';
import type { EnginePolicy } from '../provisioning-engine';
import { canonicalFabric, fakeFabric, nativeContract, compute, network, database, bucket } from './support/fakeCloud';
// @ts-ignore
import { __t } from '../../../../shared/i18n';

declare var describe: any, it: any, expect: any;

const C = (key: string, params?: Record<string, string | number>): string => __t(`fabric.contract.${key}`, params);
const E = (key: string, params?: Record<string, string | number>): string => __t(`fabric.engine.${key}`, params);
const failure = async (run: () => Promise<any>): Promise<any> => { try { await run(); return undefined; } catch (e) { return e; } };

function setup(policy?: EnginePolicy) {
  const fabric = canonicalFabric();
  const engine = policy 
    ? new ProvisioningEngine(fabric.registry, fabric.journal, new InMemoryProvisioningState(), policy)
    : new ProvisioningEngine(fabric.registry, fabric.journal, new InMemoryProvisioningState());
  return { ...fabric, engine };
}

/** Runs a plan that must be rejected; proves no provider was called and the rejection reached the journal. */
async function rejected(ir: any, policy?: EnginePolicy) {
  const s = setup(policy);
  const error = await failure(() => s.engine.executePlan(ir));
  expect(error.name).toBe('PlanRejectedError');
  expect(s.calls).toEqual([]);
  expect(s.live.size).toBe(0);
  expect(s.entries.map((e) => e.status)).toEqual(error.rejections.map(() => 'rejected'));
  return { error, rejections: error.rejections as any[], entries: s.entries };
}

const codes = (rejections: any[]): string[] => rejections.map((r) => r.code);

describe(__t('preflight_rejects_what_a_provi'), () => {
  it(__t('rejects_an_unsupported_kind_wi'), async () => {
    const { error, rejections, entries } = await rejected({ nodes: [database('db', {}, 'kubernetes')], edges: [] });
    expect(rejections).toEqual([{
      nodeId: 'db', provider: 'kubernetes', kind: 'DATABASE', code: 'KIND_UNSUPPORTED',
      reason: C('reason.kubernetes_database'),
      alternatives: [C('alt.install_plugin'), C('alt.target_managed_provider'), C('alt.remove_resource')],
    }]);
    expect(error.message).toBe(E('plan_rejected', { count: 1 }));
    expect(entries[0]).toMatchObject({ nodeId: 'db', action: 'provision', status: 'rejected', detail: `KIND_UNSUPPORTED: ${C('reason.kubernetes_database')}` });
  });

  it(__t('rejects_every_unsupported_cell'), async () => {
    const cells: Array<[any, string]> = [
      [database('x', {}, 'kubernetes'), 'kubernetes_database'], [database('x', {}, 'linux'), 'linux_database'], [network('x', '10.0.0.0/16', 'cpanel'), 'cpanel_network'],
    ];
    for (const [node, reason] of cells) {
      const { rejections } = await rejected({ nodes: [node], edges: [] });
      expect(codes(rejections)).toEqual(['KIND_UNSUPPORTED']);
      expect(rejections[0].reason).toBe(C(`reason.${reason}`));
    }
  });

  it(__t('reports_a_single_rejection_for'), async () => {
    const { rejections } = await rejected({ nodes: [{ ...database('x', { engine: 'document' }, 'kubernetes'), providerOptions: { mode: 'OPERATOR' } }], edges: [] });
    expect(codes(rejections)).toEqual(['KIND_UNSUPPORTED']);
  });

  it(__t('collects_the_rejections_of_the'), async () => {
    const ir = { nodes: [bucket('ok'), database('db', {}, 'kubernetes'), network('net', '10.0.0.0/16', 'cpanel'), database('db2', {}, 'linux')], edges: [] };
    const { error, rejections, entries } = await rejected(ir);
    expect(rejections.map((r) => r.nodeId)).toEqual(['db', 'net', 'db2']);
    expect(error.message).toBe(E('plan_rejected', { count: 3 }));
    expect(entries.map((e) => e.nodeId)).toEqual(['db', 'net', 'db2']);
  });

  it(__t('counts_resources_not_reasons_i'), async () => {
    const { error, rejections } = await rejected({ nodes: [bucket('s', { storageClass: 'FILE', sizeGb: 5, isPublic: true }, 'kubernetes')], edges: [] });
    expect(rejections.length).toBe(2);
    expect(error.message).toBe(E('plan_rejected', { count: 1 }));
  });

  it(__t('requires_a_mode_for_a_conditio'), async () => {
    const { rejections } = await rejected({ nodes: [network('net', '10.0.0.0/16', 'kubernetes')], edges: [] });
    expect(rejections).toEqual([{
      nodeId: 'net', provider: 'kubernetes', kind: 'NETWORK', code: 'MODE_REQUIRED',
      reason: C('rejection.mode_required', { provider: 'kubernetes', kind: 'NETWORK', modes: 'NETWORK_POLICY' }),
      alternatives: [C('alt.set_provider_mode'), C('alt.use_network_policy_mode'), C('alt.target_network_provider')],
    }]);
  });

  it(__t('rejects_a_mode_the_provider_do'), async () => {
    const cases: Array<[any, string]> = [
      [network('n', '10.0.0.0/16', 'kubernetes', 'VPC'), 'NETWORK_POLICY'], [compute('c', {}, 'aws', 'LAMBDA'), 'INSTANCE'], [bucket('b', {}, 'aws', 'FOO'), '-'],
      [compute('c', {}, 'cpanel', 'INSTANCE'), 'HOSTED_APP'], [network('n', '10.0.0.0/16', 'linux', 'VPC'), 'EXISTING, NETWORKMANAGER, SYSTEMD_NETWORKD, NETPLAN'],
    ];
    for (const [node, modes] of cases) {
      const { rejections } = await rejected({ nodes: [node], edges: [] });
      expect(codes(rejections)).toEqual(['MODE_UNSUPPORTED']);
      expect(rejections[0].reason).toBe(C('rejection.mode_unsupported', { provider: node.provider, kind: node.type, mode: node.providerOptions.mode, modes }));
      expect(rejections[0].alternatives).toEqual([C('alt.set_provider_mode')]);
    }
  });

  it('accepts a bare cidrBlock on Kubernetes only through NETWORK_POLICY, and a native kind with or without its mode', async () => {
    const { engine, calls } = setup();
    await engine.executePlan({ nodes: [network('net', '10.0.0.0/16', 'kubernetes', 'NETWORK_POLICY'), compute('a', {}, 'aws', 'INSTANCE'), compute('b', {}, 'aws'), compute('c', {}, 'linux'), bucket('d', { storageClass: 'FILE', sizeGb: 1 }, 'linux', 'DIRECTORY')], edges: [] });
    expect(calls.length).toBe(5);
  });

  it(__t('rejects_a_storage_class_the_pr'), async () => {
    const cases: Array<[any, string]> = [
      [bucket('b', { storageClass: 'FILE', sizeGb: 1 }, 'aws'), 'OBJECT'], [bucket('b', { storageClass: 'BLOCK', sizeGb: 1 }, 'linux', 'DIRECTORY'), 'FILE'],
      [bucket('b', { storageClass: 'OBJECT' }, 'cpanel', 'ACCOUNT_FILESYSTEM'), 'FILE'], [bucket('b', { storageClass: 'OBJECT' }, 'kubernetes', 'PVC'), __t('file_block')],
    ];
    for (const [node, classes] of cases) {
      const { rejections } = await rejected({ nodes: [node], edges: [] });
      expect(codes(rejections)).toEqual(['STORAGE_CLASS_UNSUPPORTED']);
      expect(rejections[0].reason).toBe(C('rejection.storage_class_unsupported', { provider: node.provider, storageClass: node.config.storageClass, classes }));
      expect(rejections[0].alternatives).toEqual([C('alt.use_supported_storage_class')]);
    }
  });

  it(__t('rejects_a_database_engine_the_'), async () => {
    const cases: Array<[any, string]> = [[database('d', { engine: 'document' }, 'aws'), __t('postgres_mysql')], [database('d', { engine: 'postgres' }, 'cpanel', 'MYSQL'), 'mysql']];
    for (const [node, engines] of cases) {
      const { rejections } = await rejected({ nodes: [node], edges: [] });
      expect(codes(rejections)).toEqual(['DATABASE_ENGINE_UNSUPPORTED']);
      expect(rejections[0].reason).toBe(C('rejection.database_engine_unsupported', { provider: node.provider, engine: node.config.engine, engines }));
      expect(rejections[0].alternatives).toEqual([C('alt.use_supported_engine')]);
    }
  });

  it(__t('accepts_what_the_contract_allo'), async () => {
    const { engine, calls } = setup();
    await engine.executePlan({ nodes: [database('a', { engine: 'postgres' }), database('b', { engine: 'mysql' }), database('c', { engine: 'mysql' }, 'cpanel', 'MYSQL')], edges: [] });
    expect(calls.length).toBe(3);
  });

  it(__t('falls_back_to_a_generic_reason'), async () => {
    const contract: any = nativeContract('lab');
    contract.kinds.NETWORK = { status: 'UNSUPPORTED', modes: [] };
    const fabric = fakeFabric(['lab'], () => contract);
    const error = await failure(() => new ProvisioningEngine(fabric.registry, fabric.journal, new InMemoryProvisioningState()).executePlan({ nodes: [network('n', '10.0.0.0/16', 'lab')], edges: [] }));
    expect(error.rejections[0].reason).toBe(C('reason.generic', { provider: 'lab', kind: 'NETWORK' }));
    expect(error.rejections[0].alternatives).toEqual([]);
    expect(fabric.calls).toEqual([]);
  });

  it(__t('rejects_the_plan_the_same_way_'), async () => {
    const s = setup();
    const ir = { nodes: [database('db', {}, 'linux')], edges: [] };
    const first = await failure(() => s.engine.executePlan(ir));
    const second = await failure(() => s.engine.executePlan(ir));
    expect(second.rejections).toEqual(first.rejections);
    expect(s.entries.length).toBe(2);
  });
});

describe(__t('public_storage_needs_support_p'), () => {
  const pub = (extra: Record<string, unknown> = {}, provider = 'aws') => ({ nodes: [bucket('site', { isPublic: true, ...extra }, provider)], edges: [] });

  it(__t('refuses_public_storage_by_defa'), async () => {
    const { rejections } = await rejected(pub({ publicAccessConfirmed: true }));
    expect(rejections).toEqual([{
      nodeId: 'site', provider: 'aws', kind: 'STORAGE', code: 'PUBLIC_STORAGE_PROHIBITED', reason: C('rejection.public_storage_prohibited', { node: 'site' }),
      alternatives: [C('alt.make_storage_private'), C('alt.allow_public_storage_policy')],
    }]);
  });

  it(__t('shows_the_security_warning_whe'), async () => {
    const { rejections } = await rejected(pub(), { allowPublicStorage: true });
    expect(rejections).toEqual([{
      nodeId: 'site', provider: 'aws', kind: 'STORAGE', code: 'PUBLIC_STORAGE_UNCONFIRMED', reason: C('rejection.public_storage_unconfirmed', { node: 'site' }),
      alternatives: [C('alt.make_storage_private'), C('alt.confirm_public_access')],
    }]);
    expect((await rejected(pub({ publicAccessConfirmed: false }), { allowPublicStorage: true })).rejections[0].code).toBe('PUBLIC_STORAGE_UNCONFIRMED');
  });

  it(__t('provisions_public_object_stora'), async () => {
    const { engine, calls, live } = setup({ allowPublicStorage: true });
    await engine.executePlan(pub({ publicAccessConfirmed: true }));
    expect(calls).toEqual(['aws:create:storage:site']);
    expect(live.get('aws-storage-1')?.config).toEqual({ name: 'site', storageClass: 'OBJECT', isPublic: true, publicAccessConfirmed: true });
  });

  it(__t('never_lets_a_confirmation_over'), async () => {
    for (const policy of [{}, { allowPublicStorage: false }]) {
      expect(codes((await rejected(pub({ publicAccessConfirmed: true }), policy)).rejections)).toEqual(['PUBLIC_STORAGE_PROHIBITED']);
    }
  });

  it(__t('rejects_public_access_wherever'), async () => {
    for (const [provider, extra] of [['linux', { storageClass: 'FILE', sizeGb: 1 }], ['cpanel', { storageClass: 'FILE', sizeGb: 1 }], ['kubernetes', { storageClass: 'BLOCK', sizeGb: 1 }]] as Array<[string, any]>) {
      const modes: Record<string, string> = { linux: 'DIRECTORY', cpanel: 'ACCOUNT_FILESYSTEM', kubernetes: 'PVC' };
      const node = bucket('site', { isPublic: true, publicAccessConfirmed: true, ...extra }, provider, modes[provider]);
      const { rejections } = await rejected({ nodes: [node], edges: [] }, { allowPublicStorage: true });
      expect(codes(rejections)).toEqual(['PUBLIC_STORAGE_UNSUPPORTED']);
      expect(rejections[0].reason).toBe(C('rejection.public_storage_unsupported', { provider, storageClass: extra.storageClass }));
      expect(rejections[0].alternatives).toEqual([C('alt.make_storage_private')]);
    }
  });

  it(__t('keeps_private_storage_unrestri'), async () => {
    const { engine, calls } = setup();
    await engine.executePlan({ nodes: [bucket('a'), bucket('b', { publicAccessConfirmed: true })], edges: [] });
    expect(calls.length).toBe(2);
  });

  it(__t('reports_an_unsupported_storage'), async () => {
    const { rejections } = await rejected({ nodes: [bucket('site', { storageClass: 'OBJECT', isPublic: true, publicAccessConfirmed: true }, 'kubernetes', 'PVC')], edges: [] }, { allowPublicStorage: true });
    expect(codes(rejections)).toEqual(['STORAGE_CLASS_UNSUPPORTED']);
  });
});

describe(__t('plans_carry_credential_referen'), () => {
  const refused = async (config: Record<string, unknown>, options?: Record<string, unknown>) => {
    const s = setup();
    const node: any = compute('web', config);
    if (options) node.providerOptions = options;
    const error = await failure(() => s.engine.executePlan({ nodes: [node], edges: [] }));
    expect(error.name).toBe('Error');
    expect(s.calls).toEqual([]);
    expect(s.entries).toEqual([]);
    return error.message as string;
  };

  it(__t('refuses_a_credential_named_fie'), async () => {
    for (const field of ['adminPassword', 'db_password', 'DBPASSWORD', 'db_passwd', 'apiKey', 'api_key', 'accessToken', 'clientSecret', 'privateKey', 'private_key', 'credentials', 'credentialsRef']) {
      expect(await refused({ [field]: 'hunter2' })).toBe(E('secret_in_plan', { node: 'web', field }));
    }
  });

  it(__t('refuses_empty_non_string_and_n'), async () => {
    for (const value of ['', 5, true, null, 'secret:', __t('secret'), 'Secret:x', __t('secret_x')]) {
      expect(await refused({ adminPassword: value })).toBe(E('secret_in_plan', { node: 'web', field: 'adminPassword' }));
    }
  });

  it(__t('applies_the_same_rule_to_the_p'), async () => {
    expect(await refused({}, { mode: 'INSTANCE', privateKey: __t('begin_key') })).toBe(E('secret_in_plan', { node: 'web', field: 'privateKey' }));
  });

  it(__t('forwards_a_credential_referenc'), async () => {
    const s = setup();
    const report = await s.engine.executePlan({ nodes: [database('db', { credentialsRef: 'secret:db-admin' })], edges: [] });
    expect(s.live.get('aws-database-1')?.config.credentialsRef).toBe('secret:db-admin');
    expect(report.provisioned[0]!.evidence.requested.credentialsRef).toBe('secret:db-admin');
    expect(s.entries.find((e) => e.status === 'success')?.evidence?.requested.credentialsRef).toBe('secret:db-admin');
    expect(report.created).toEqual(['db']);
  });
});
