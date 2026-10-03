/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Provider Fabric — Provisioning Engine (execution)
 * File           : provisioning-engine.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { ProvisioningEngine, InMemoryProvisioningState } from '../provisioning-engine';
import { fakeFabric, compute, network, database, bucket } from './support/fakeCloud';
// @ts-ignore
import { __t } from '../../../../shared/i18n';

declare var describe: any, it: any, expect: any;

const T = (key: string, params?: Record<string, string | number>): string => __t(`fabric.engine.${key}`, params);
const failure = async (run: () => Promise<any>): Promise<any> => { try { await run(); return undefined; } catch (e) { return e; } };
const edge = (from: string, to: string) => ({ from, to });
const onProvider = (nodes: any[], provider: string) => nodes.map((n) => ({ ...n, provider }));

function setup(providers: string[] = ['aws']) {
  const fabric = fakeFabric(providers);
  const state = new InMemoryProvisioningState();
  return { ...fabric, state, engine: new ProvisioningEngine(fabric.registry, fabric.journal, state) };
}

describe('Provisioning engine: execution order (FAB-03)', () => {
  it('creates requisites first, resolves references to real resource ids and reports every node', async () => {
    const { engine, calls, entries, live } = setup();
    const ir = { nodes: [compute('web', { networkRefId: 'ref:net' }), network('net')], edges: [edge('net', 'web')] };
    const report = await engine.executePlan(ir);

    expect(calls).toEqual(['aws:create:network:net', 'aws:create:compute:web']);
    expect(live.get('aws-compute-2')?.config.networkRefId).toBe('aws-network-1');
    expect(report.provisioned.map((r) => [r.nodeId, r.kind, r.resourceId])).toEqual([['net', 'NETWORK', 'aws-network-1'], ['web', 'COMPUTE', 'aws-compute-2']]);
    expect(report.created).toEqual(['net', 'web']);
    expect(report.unchanged).toEqual([]);
    expect(entries.map((e) => `${e.nodeId}:${e.action}:${e.status}`)).toEqual(['net:provision:pending', 'net:provision:success', 'web:provision:pending', 'web:provision:success']);
    expect(entries[1]?.resourceId).toBe('aws-network-1');
  });

  it('never creates a dependent before everything it depends on, whatever order the nodes are listed in', async () => {
    const { engine, calls } = setup();
    const ir = {
      nodes: [bucket('assets'), database('db'), compute('web'), network('net')],
      edges: [edge('net', 'web'), edge('net', 'db'), edge('web', 'assets'), edge('db', 'assets')],
    };
    await engine.executePlan(ir);
    const at = (name: string): number => calls.findIndex((c) => c.endsWith(`:${name}`));
    expect(at('net')).toBe(0);
    expect(at('assets')).toBe(3);
    expect(at('web')).toBeLessThan(at('assets'));
    expect(at('db')).toBeLessThan(at('assets'));
  });

  it('starts independent nodes together instead of one after the other', async () => {
    const { engine, entries } = setup();
    await engine.executePlan({ nodes: [bucket('a'), bucket('b')], edges: [] });
    expect(entries.map((e) => `${e.nodeId}:${e.status}`)).toEqual(['a:pending', 'b:pending', 'a:success', 'b:success']);
  });

  it('hands the provider only the validated fields of a node, never stray configuration or a credential reference', async () => {
    const { engine, live } = setup();
    await engine.executePlan({ nodes: [compute('web', { junk: 'x', adminPassword: 'secret:db-admin' })], edges: [] });
    expect(live.get('aws-compute-1')?.config).toEqual({ instanceName: 'web', cpuCores: 2, memoryMb: 2048, osImage: 'ubuntu-24.04' });
    expect(live.get('aws-compute-1')?.options).toEqual({});
  });

  it('provisions an empty plan without touching anything', async () => {
    const { engine, calls } = setup();
    expect(await engine.executePlan({ nodes: [], edges: [] })).toEqual({ provisioned: [], created: [], unchanged: [] });
    expect(calls).toEqual([]);
  });

  it('hands provider options to all kinds of resources', async () => {
    const { engine, live } = setup();
    const myOptions = { custom: 'yes' };
    const ir = {
      nodes: [
        { ...compute('web'), providerOptions: myOptions },
        { ...network('net'), providerOptions: myOptions },
        { ...database('db'), providerOptions: myOptions },
        { ...bucket('assets'), providerOptions: myOptions },
      ],
      edges: []
    };
    await engine.executePlan(ir);
    expect(live.get('aws-compute-1')?.options).toEqual(myOptions);
    expect(live.get('aws-network-2')?.options).toEqual(myOptions);
    expect(live.get('aws-database-3')?.options).toEqual(myOptions);
    expect(live.get('aws-storage-4')?.options).toEqual(myOptions);
  });
});

describe('Provisioning engine: multi-target (FAB-02)', () => {
  const nodes = [network('net'), compute('web', { networkRefId: 'ref:net' }), database('db'), bucket('assets')];
  const edges = [edge('net', 'web')];

  it('provisions the same plan on different providers, each call reaching only its own adapter', async () => {
    const shapes: string[][] = [];
    for (const provider of ['aws', 'linux']) {
      const { engine, calls } = setup(['aws', 'linux']);
      await engine.executePlan({ nodes: onProvider(nodes, provider), edges });
      expect(calls.every((c) => c.startsWith(`${provider}:`))).toBe(true);
      shapes.push(calls.map((c) => c.slice(provider.length)));
    }
    expect(shapes[0]).toHaveLength(4);
    expect(shapes[1]).toEqual(shapes[0]);
  });

  it('mixes providers inside one plan', async () => {
    const { engine, calls } = setup(['aws', 'linux']);
    await engine.executePlan({ nodes: [{ ...network('net'), provider: 'aws' }, { ...bucket('assets'), provider: 'linux' }], edges: [] });
    expect([...calls].sort()).toEqual(['aws:create:network:net', 'linux:create:storage:assets']);
  });
});

describe('Provisioning engine: idempotency (FAB-05)', () => {
  const ir = () => ({ nodes: [compute('web', { networkRefId: 'ref:net' }), network('net'), database('db')], edges: [edge('net', 'web')] });

  it('makes no provider call at all on the second pass and returns the same resources', async () => {
    const { engine, calls, entries } = setup();
    const first = await engine.executePlan(ir());
    const callsAfterFirst = calls.length;
    const mark = entries.length;
    const second = await engine.executePlan(ir());

    expect(calls).toHaveLength(callsAfterFirst);
    expect(second.created).toEqual([]);
    expect([...second.unchanged].sort()).toEqual(['db', 'net', 'web']);
    expect(second.provisioned.map((r) => r.resourceId)).toEqual(first.provisioned.map((r) => r.resourceId));
    expect(entries.slice(mark).map((e) => e.status)).toEqual(['skipped', 'skipped', 'skipped']);
    expect(entries.slice(mark).every((e) => e.resourceId !== undefined)).toBe(true);
  });

  it('treats a reordered configuration as identical', async () => {
    const { engine, calls } = setup();
    await engine.executePlan({ nodes: [database('db')], edges: [] });
    const reordered = { id: 'db', type: 'DATABASE', provider: 'aws', config: { capacity: 20, engine: 'postgres', name: 'db' } };
    const report = await engine.executePlan({ nodes: [reordered], edges: [] });
    expect(report.unchanged).toEqual(['db']);
    expect(calls).toHaveLength(1);
  });

  it('only creates what is missing when the plan grows', async () => {
    const { engine, calls } = setup();
    await engine.executePlan({ nodes: [network('net')], edges: [] });
    const report = await engine.executePlan({ nodes: [network('net'), bucket('assets')], edges: [] });
    expect(report.created).toEqual(['assets']);
    expect(report.unchanged).toEqual(['net']);
    expect(calls).toEqual(['aws:create:network:net', 'aws:create:storage:assets']);
  });

  it('refuses to silently change an existing node and leaves it, and everything else it created, untouched', async () => {
    const { engine, calls, live, state } = setup();
    await engine.executePlan({ nodes: [network('net')], edges: [] });
    const error = await failure(() => engine.executePlan({ nodes: [network('net', '10.1.0.0/16'), bucket('assets')], edges: [] }));

    expect(error.name).toBe('ProvisioningError');
    expect(error.message).toBe(T('plan_failed', { error: T('state_conflict', { node: 'net' }) }));
    expect(error.cause.message).toBe(T('state_conflict', { node: 'net' }));
    expect(error.rolledBack).toEqual(['assets']);
    expect(error.rollbackFailures).toEqual([]);
    expect([...live.keys()]).toEqual(['aws-network-1']);
    expect((await state.get('net'))?.resourceId).toBe('aws-network-1');
    expect(await state.get('assets')).toBeUndefined();
    expect(calls).toEqual(['aws:create:network:net', 'aws:create:storage:assets', 'aws:delete:storage:aws-storage-2']);
  });
});
