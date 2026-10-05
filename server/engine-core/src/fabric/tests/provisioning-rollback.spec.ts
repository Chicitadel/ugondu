/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Provider Fabric — Provisioning Engine (failure handling)
 * File           : provisioning-rollback.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { ProvisioningEngine, InMemoryProvisioningState } from '../provisioning-engine';
import type { ProvisionedRecord } from '../provisioning-engine';
import { fakeFabric, compute, network, database, bucket } from './support/fakeCloud';
// @ts-ignore
import { __t } from '../../../../shared/i18n';

declare var describe: any, it: any, expect: any;

const T = (key: string, params?: Record<string, string | number>): string => __t(`fabric.engine.${key}`, params);
const failure = async (run: () => Promise<any>): Promise<any> => { try { await run(); return undefined; } catch (e) { return e; } };
const edge = (from: string, to: string) => ({ from, to });
const stack = () => ({ nodes: [network('net'), compute('web', { networkRefId: 'ref:net' }), database('db')], edges: [edge('net', 'web'), edge('net', 'db')] });

function setup(state = new InMemoryProvisioningState(), journal?: any) {
  const fabric = fakeFabric(['aws']);
  return { ...fabric, state, engine: new ProvisioningEngine(fabric.registry, journal ?? fabric.journal, state) };
}

describe('Provisioning engine: error containment (FAB-04)', () => {
  it('rolls back what the run created, newest first, so a network is never deleted under its instance', async () => {
    const { engine, clouds, calls, live, state, entries } = setup();
    clouds.aws!.failCreate('database', 'db');
    const error = await failure(() => engine.executePlan(stack()));

    expect(error.name).toBe('ProvisioningError');
    expect(error.message).toBe(T('plan_failed', { error: 'injected failure: database:db' }));
    expect(error.cause.message).toBe('injected failure: database:db');
    expect(error.rolledBack).toEqual(['web', 'net']);
    expect(error.rollbackFailures).toEqual([]);
    expect(live.size).toBe(0);
    expect(calls.slice(-2)).toEqual(['aws:delete:compute:aws-compute-2', 'aws:delete:network:aws-network-1']);
    expect(await state.get('net')).toBeUndefined();
    expect(await state.get('web')).toBeUndefined();
    const last = entries.filter((e) => e.action === 'deprovision').map((e) => `${e.nodeId}:${e.status}`);
    expect(last).toEqual(['web:pending', 'web:success', 'net:pending', 'net:success']);
    expect(entries.find((e) => e.nodeId === 'db' && e.status === 'failed')?.detail).toBe('injected failure: database:db');
  });

  it('keeps a resource of an earlier run that failed plans never created', async () => {
    const { engine, clouds, live } = setup();
    await engine.executePlan({ nodes: [network('net')], edges: [] });
    clouds.aws!.failCreate('database', 'db');
    await failure(() => engine.executePlan({ nodes: [network('net'), database('db')], edges: [] }));
    expect([...live.keys()]).toEqual(['aws-network-1']);
  });

  it('treats a failed state reported by the provider as a failure, removes what it left behind and records nothing for that node', async () => {
    const { engine, state, live, calls } = setup();
    const error = await failure(() => engine.executePlan({ nodes: [network('net'), compute('web', { networkRefId: 'ref:net', osImage: 'broken' })], edges: [edge('net', 'web')] }));
    expect(error.cause.message).toBe(T('provider_reported_failure', { node: 'web' }));
    expect(await state.get('web')).toBeUndefined();
    expect(error.rolledBack).toEqual(['net']);
    expect(live.size).toBe(0);
    expect(calls).toEqual(['aws:create:network:net', 'aws:create:compute:web', 'aws:delete:compute:aws-compute-2', 'aws:delete:network:aws-network-1']);
  });

  it('reports every resource it could not remove instead of hiding it, and keeps those recorded', async () => {
    const { engine, clouds, state, entries } = setup();
    clouds.aws!.failDelete('aws-compute-2');
    clouds.aws!.failCreate('database', 'db');
    const error = await failure(() => engine.executePlan(stack()));

    expect(error.rolledBack).toEqual([]);
    expect(error.rollbackFailures).toEqual([
      { nodeId: 'web', resourceId: 'aws-compute-2', error: 'injected delete failure: aws-compute-2' },
      { nodeId: 'net', resourceId: 'aws-network-1', error: 'network aws-network-1 still hosts an instance' },
    ]);
    expect(error.message).toBe(T('plan_failed_rollback_incomplete', { error: 'injected failure: database:db', count: 2 }));
    expect((await state.get('web'))?.resourceId).toBe('aws-compute-2');
    expect((await state.get('net'))?.resourceId).toBe('aws-network-1');
    expect(entries.filter((e) => e.action === 'deprovision' && e.status === 'failed').map((e) => e.nodeId)).toEqual(['web', 'net']);
  });

  it('continues rolling back the remaining resources when one removal fails', async () => {
    const { engine, clouds, live, state } = setup();
    clouds.aws!.failDelete('aws-storage-2');
    clouds.aws!.failCreate('compute', 'web');
    const ir = { nodes: [network('net'), bucket('assets'), compute('web', { networkRefId: 'ref:net' })], edges: [edge('net', 'web')] };
    const error = await failure(() => engine.executePlan(ir));
    expect(error.rolledBack).toEqual(['net']);
    expect(error.rollbackFailures.map((f: any) => f.nodeId)).toEqual(['assets']);
    expect([...live.keys()]).toEqual(['aws-storage-2']);
    expect((await state.get('assets'))?.resourceId).toBeDefined();
  });

  it('removes a resource that was created but could not be recorded, so nothing is orphaned', async () => {
    const memory = new InMemoryProvisioningState();
    const failing: any = { get: memory.get.bind(memory), remove: memory.remove.bind(memory), put: async (r: ProvisionedRecord) => { if (r.nodeId === 'net') throw new Error('state store down'); await memory.put(r); } };
    const { engine, calls, live } = setup(failing);
    const error = await failure(() => engine.executePlan({ nodes: [network('net')], edges: [] }));
    expect(error.cause.message).toBe('state store down');
    expect(calls).toEqual(['aws:create:network:net', 'aws:delete:network:aws-network-1']);
    expect(live.size).toBe(0);
  });

  it('rolls back databases and buckets as well, newest first', async () => {
    const { engine, clouds, calls, live } = setup();
    clouds.aws!.failCreate('compute', 'web');
    const ir = { nodes: [network('net'), database('db'), bucket('assets'), compute('web', { networkRefId: 'ref:net' })], edges: [edge('net', 'web')] };
    const error = await failure(() => engine.executePlan(ir));
    expect(error.rolledBack).toEqual(['assets', 'db', 'net']);
    expect(calls.slice(-3)).toEqual(['aws:delete:storage:aws-storage-3', 'aws:delete:database:aws-database-2', 'aws:delete:network:aws-network-1']);
    expect(live.size).toBe(0);
  });

  it('reports the error of the first failing node when several nodes of one layer fail', async () => {
    const { engine, clouds } = setup();
    clouds.aws!.failCreate('storage', 'a');
    clouds.aws!.failCreate('storage', 'b');
    const error = await failure(() => engine.executePlan({ nodes: [bucket('a'), bucket('b')], edges: [] }));
    expect(error.cause.message).toBe('injected failure: storage:a');
  });

  it('refuses a provider answer that carries no resource id', async () => {
    const { engine, clouds, state } = setup();
    clouds.aws!.storage.provisionStorage = async () => ({ id: '', endpoint: '' });
    const error = await failure(() => engine.executePlan({ nodes: [bucket('assets')], edges: [] }));
    expect(error.cause.message).toBe(T('no_resource_id', { node: 'assets' }));
    expect(await state.get('assets')).toBeUndefined();
  });

  it('fails closed when the journal cannot record the intention, before any provider call', async () => {
    const journal = { log: async () => { throw new Error('journal unavailable'); } };
    const { engine, calls } = setup(undefined, journal);
    const error = await failure(() => engine.executePlan({ nodes: [network('net')], edges: [] }));
    expect(error.cause.message).toBe('journal unavailable');
    expect(error.rolledBack).toEqual([]);
    expect(calls).toEqual([]);
  });
});
