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

describe('Preflight rejects what a provider cannot faithfully do (FAB-08)', () => {
  it('rejects an unsupported kind with the reason, the alternatives and a journal entry, before any call', async () => {
    const { error, rejections, entries } = await rejected({ nodes: [database('db', {}, 'kubernetes')], edges: [] });
    expect(rejections).toEqual([{
      nodeId: 'db', provider: 'kubernetes', kind: 'DATABASE', code: 'KIND_UNSUPPORTED',
      reason: C('reason.kubernetes_database'),
      alternatives: [C('alt.install_plugin'), C('alt.target_managed_provider'), C('alt.remove_resource')],
    }]);
    expect(error.message).toBe(E('plan_rejected', { count: 1 }));
    expect(entries[0]).toMatchObject({ nodeId: 'db', action: 'provision', status: 'rejected', detail: `KIND_UNSUPPORTED: ${C('reason.kubernetes_database')}` });
  });

  it('rejects every unsupported cell of the matrix', async () => {
    const cells: Array<[any, string]> = [
      [database('x', {}, 'kubernetes'), 'kubernetes_database'], [database('x', {}, 'linux'), 'linux_database'], [network('x', '10.0.0.0/16', 'cpanel'), 'cpanel_network'],
    ];
    for (const [node, reason] of cells) {
      const { rejections } = await rejected({ nodes: [node], edges: [] });
      expect(codes(rejections)).toEqual(['KIND_UNSUPPORTED']);
      expect(rejections[0].reason).toBe(C(`reason.${reason}`));
    }
  });

  it('reports a single rejection for an unsupported kind even when a mode or an unsupported engine is also given', async () => {
    const { rejections } = await rejected({ nodes: [{ ...database('x', { engine: 'document' }, 'kubernetes'), providerOptions: { mode: 'OPERATOR' } }], edges: [] });
    expect(codes(rejections)).toEqual(['KIND_UNSUPPORTED']);
  });

  it('collects the rejections of the whole plan and rejects it entirely, including its valid nodes', async () => {
    const ir = { nodes: [bucket('ok'), database('db', {}, 'kubernetes'), network('net', '10.0.0.0/16', 'cpanel'), database('db2', {}, 'linux')], edges: [] };
    const { error, rejections, entries } = await rejected(ir);
    expect(rejections.map((r) => r.nodeId)).toEqual(['db', 'net', 'db2']);
    expect(error.message).toBe(E('plan_rejected', { count: 3 }));
    expect(entries.map((e) => e.nodeId)).toEqual(['db', 'net', 'db2']);
  });

  it('counts resources, not reasons, in the summary', async () => {
    const { error, rejections } = await rejected({ nodes: [bucket('s', { storageClass: 'FILE', sizeGb: 5, isPublic: true }, 'kubernetes')], edges: [] });
    expect(rejections.length).toBe(2);
    expect(error.message).toBe(E('plan_rejected', { count: 1 }));
  });

  it('requires a mode for a conditional kind and offers the way out', async () => {
    const { rejections } = await rejected({ nodes: [network('net', '10.0.0.0/16', 'kubernetes')], edges: [] });
    expect(rejections).toEqual([{
      nodeId: 'net', provider: 'kubernetes', kind: 'NETWORK', code: 'MODE_REQUIRED',
      reason: C('rejection.mode_required', { provider: 'kubernetes', kind: 'NETWORK', modes: 'NETWORK_POLICY' }),
      alternatives: [C('alt.set_provider_mode'), C('alt.use_network_policy_mode'), C('alt.target_network_provider')],
    }]);
  });

  it('rejects a mode the provider does not offer for the kind, native or conditional', async () => {
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

  it('rejects a storage class the provider does not serve, naming what it does serve', async () => {
    const cases: Array<[any, string]> = [
      [bucket('b', { storageClass: 'FILE', sizeGb: 1 }, 'aws'), 'OBJECT'], [bucket('b', { storageClass: 'BLOCK', sizeGb: 1 }, 'linux', 'DIRECTORY'), 'FILE'],
      [bucket('b', { storageClass: 'OBJECT' }, 'cpanel', 'ACCOUNT_FILESYSTEM'), 'FILE'], [bucket('b', { storageClass: 'OBJECT' }, 'kubernetes', 'PVC'), 'FILE, BLOCK'],
    ];
    for (const [node, classes] of cases) {
      const { rejections } = await rejected({ nodes: [node], edges: [] });
      expect(codes(rejections)).toEqual(['STORAGE_CLASS_UNSUPPORTED']);
      expect(rejections[0].reason).toBe(C('rejection.storage_class_unsupported', { provider: node.provider, storageClass: node.config.storageClass, classes }));
      expect(rejections[0].alternatives).toEqual([C('alt.use_supported_storage_class')]);
    }
  });

  it('rejects a database engine the provider does not serve, naming what it does serve', async () => {
    const cases: Array<[any, string]> = [[database('d', { engine: 'document' }, 'aws'), 'postgres, mysql'], [database('d', { engine: 'postgres' }, 'cpanel', 'MYSQL'), 'mysql']];
    for (const [node, engines] of cases) {
      const { rejections } = await rejected({ nodes: [node], edges: [] });
      expect(codes(rejections)).toEqual(['DATABASE_ENGINE_UNSUPPORTED']);
      expect(rejections[0].reason).toBe(C('rejection.database_engine_unsupported', { provider: node.provider, engine: node.config.engine, engines }));
      expect(rejections[0].alternatives).toEqual([C('alt.use_supported_engine')]);
    }
  });

  it('accepts what the contract allows: RDS engines and MySQL on cPanel', async () => {
    const { engine, calls } = setup();
    await engine.executePlan({ nodes: [database('a', { engine: 'postgres' }), database('b', { engine: 'mysql' }), database('c', { engine: 'mysql' }, 'cpanel', 'MYSQL')], edges: [] });
    expect(calls.length).toBe(3);
  });

  it('falls back to a generic reason and no alternatives when the declaration gives none', async () => {
    const contract: any = nativeContract('lab');
    contract.kinds.NETWORK = { status: 'UNSUPPORTED', modes: [] };
    const fabric = fakeFabric(['lab'], () => contract);
    const error = await failure(() => new ProvisioningEngine(fabric.registry, fabric.journal).executePlan({ nodes: [network('n', '10.0.0.0/16', 'lab')], edges: [] }));
    expect(error.rejections[0].reason).toBe(C('reason.generic', { provider: 'lab', kind: 'NETWORK' }));
    expect(error.rejections[0].alternatives).toEqual([]);
    expect(fabric.calls).toEqual([]);
  });

  it('rejects the plan the same way every time (no state is created by a rejection)', async () => {
    const s = setup();
    const ir = { nodes: [database('db', {}, 'linux')], edges: [] };
    const first = await failure(() => s.engine.executePlan(ir));
    const second = await failure(() => s.engine.executePlan(ir));
    expect(second.rejections).toEqual(first.rejections);
    expect(s.entries.length).toBe(2);
  });
});

describe('Public storage needs support, policy and confirmation (FAB-09)', () => {
  const pub = (extra: Record<string, unknown> = {}, provider = 'aws') => ({ nodes: [bucket('site', { isPublic: true, ...extra }, provider)], edges: [] });

  it('refuses public storage by default policy, with a way out', async () => {
    const { rejections } = await rejected(pub({ publicAccessConfirmed: true }));
    expect(rejections).toEqual([{
      nodeId: 'site', provider: 'aws', kind: 'STORAGE', code: 'PUBLIC_STORAGE_PROHIBITED', reason: C('rejection.public_storage_prohibited', { node: 'site' }),
      alternatives: [C('alt.make_storage_private'), C('alt.allow_public_storage_policy')],
    }]);
  });

  it('shows the security warning when policy allows it but the user has not confirmed', async () => {
    const { rejections } = await rejected(pub(), { allowPublicStorage: true });
    expect(rejections).toEqual([{
      nodeId: 'site', provider: 'aws', kind: 'STORAGE', code: 'PUBLIC_STORAGE_UNCONFIRMED', reason: C('rejection.public_storage_unconfirmed', { node: 'site' }),
      alternatives: [C('alt.make_storage_private'), C('alt.confirm_public_access')],
    }]);
    expect((await rejected(pub({ publicAccessConfirmed: false }), { allowPublicStorage: true })).rejections[0].code).toBe('PUBLIC_STORAGE_UNCONFIRMED');
  });

  it('provisions public object storage only when policy allows it and the user confirmed', async () => {
    const { engine, calls, live } = setup({ allowPublicStorage: true });
    await engine.executePlan(pub({ publicAccessConfirmed: true }));
    expect(calls).toEqual(['aws:create:storage:site']);
    expect(live.get('aws-storage-1')?.config).toEqual({ name: 'site', storageClass: 'OBJECT', isPublic: true, publicAccessConfirmed: true });
  });

  it('never lets a confirmation override a policy that prohibits public storage', async () => {
    for (const policy of [{}, { allowPublicStorage: false }]) {
      expect(codes((await rejected(pub({ publicAccessConfirmed: true }), policy)).rejections)).toEqual(['PUBLIC_STORAGE_PROHIBITED']);
    }
  });

  it('rejects public access wherever it is not meaningful, whatever the policy and confirmation', async () => {
    for (const [provider, extra] of [['linux', { storageClass: 'FILE', sizeGb: 1 }], ['cpanel', { storageClass: 'FILE', sizeGb: 1 }], ['kubernetes', { storageClass: 'BLOCK', sizeGb: 1 }]] as Array<[string, any]>) {
      const modes: Record<string, string> = { linux: 'DIRECTORY', cpanel: 'ACCOUNT_FILESYSTEM', kubernetes: 'PVC' };
      const node = bucket('site', { isPublic: true, publicAccessConfirmed: true, ...extra }, provider, modes[provider]);
      const { rejections } = await rejected({ nodes: [node], edges: [] }, { allowPublicStorage: true });
      expect(codes(rejections)).toEqual(['PUBLIC_STORAGE_UNSUPPORTED']);
      expect(rejections[0].reason).toBe(C('rejection.public_storage_unsupported', { provider, storageClass: extra.storageClass }));
      expect(rejections[0].alternatives).toEqual([C('alt.make_storage_private')]);
    }
  });

  it('keeps private storage unrestricted and ignores a confirmation it does not need', async () => {
    const { engine, calls } = setup();
    await engine.executePlan({ nodes: [bucket('a'), bucket('b', { publicAccessConfirmed: true })], edges: [] });
    expect(calls.length).toBe(2);
  });

  it('reports an unsupported storage class on its own, without piling public-access rules on top', async () => {
    const { rejections } = await rejected({ nodes: [bucket('site', { storageClass: 'OBJECT', isPublic: true, publicAccessConfirmed: true }, 'kubernetes', 'PVC')], edges: [] }, { allowPublicStorage: true });
    expect(codes(rejections)).toEqual(['STORAGE_CLASS_UNSUPPORTED']);
  });
});

describe('Plans carry credential references, never credential values (FAB-10)', () => {
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

  it('refuses a credential-named field that holds a value, whatever its spelling', async () => {
    for (const field of ['adminPassword', 'db_password', 'DBPASSWORD', 'db_passwd', 'apiKey', 'api_key', 'accessToken', 'clientSecret', 'privateKey', 'private_key', 'credentials', 'credentialsRef']) {
      expect(await refused({ [field]: 'hunter2' })).toBe(E('secret_in_plan', { node: 'web', field }));
    }
  });

  it('refuses empty, non-string and nameless references', async () => {
    for (const value of ['', 5, true, null, 'secret:', 'secret:   ', 'Secret:x', ' secret:x']) {
      expect(await refused({ adminPassword: value })).toBe(E('secret_in_plan', { node: 'web', field: 'adminPassword' }));
    }
  });

  it('applies the same rule to the provider extension block', async () => {
    expect(await refused({}, { mode: 'INSTANCE', privateKey: '-----BEGIN KEY-----' })).toBe(E('secret_in_plan', { node: 'web', field: 'privateKey' }));
  });

  it('forwards a credential reference to the provider unchanged and records only the reference', async () => {
    const s = setup();
    const report = await s.engine.executePlan({ nodes: [database('db', { credentialsRef: 'secret:db-admin' })], edges: [] });
    expect(s.live.get('aws-database-1')?.config.credentialsRef).toBe('secret:db-admin');
    expect(report.provisioned[0]!.evidence.requested.credentialsRef).toBe('secret:db-admin');
    expect(s.entries.find((e) => e.status === 'success')?.evidence?.requested.credentialsRef).toBe('secret:db-admin');
    expect(report.created).toEqual(['db']);
  });
});
