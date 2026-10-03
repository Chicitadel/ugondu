/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Provider Fabric — Provisioning Engine (preflight and plan graph)
 * File           : provisioning-preflight.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { ProvisioningEngine, InMemoryProvisioningState } from '../provisioning-engine';
import { isIpv4Cidr } from '../engine/NodeHandlers';
import { digestOf, provisioningWaves, resolveReferences, ancestorsOf, referencesOf } from '../engine/PlanGraph';
import { fakeFabric, compute, network, database, bucket } from './support/fakeCloud';
// @ts-ignore
import { __t } from '../../../../shared/i18n';

declare var describe: any, it: any, expect: any;

const T = (key: string, params?: Record<string, string | number>): string => __t(`fabric.engine.${key}`, params);
const failure = async (run: () => Promise<any>): Promise<any> => { try { await run(); return undefined; } catch (e) { return e; } };
const edge = (from: string, to: string) => ({ from, to });

/** A rejected plan must be a plain error, with nothing created, nothing journalled and nothing recorded. */
async function refused(ir: any): Promise<string> {
  const fabric = fakeFabric(['aws']);
  const error = await failure(() => new ProvisioningEngine(fabric.registry, fabric.journal).executePlan(ir));
  expect(error).toBeDefined();
  expect(error.name).toBe('Error');
  expect(fabric.calls).toEqual([]);
  expect(fabric.entries).toEqual([]);
  return error.message;
}

describe('Provisioning engine: preflight rejects a bad plan before any change', () => {
  it('rejects duplicate and empty node ids, unknown edge ends and cycles', async () => {
    expect(await refused({ nodes: [bucket('a'), bucket('a')], edges: [] })).toBe(T('duplicate_node', { node: 'a' }));
    expect(await refused({ nodes: [{ ...bucket('a'), id: '' }], edges: [] })).toBe(T('duplicate_node', { node: '' }));
    expect(await refused({ nodes: [bucket('a')], edges: [edge('a', 'ghost')] })).toBe(T('unknown_edge_node', { node: 'ghost' }));
    expect(await refused({ nodes: [bucket('a')], edges: [edge('ghost', 'a')] })).toBe(T('unknown_edge_node', { node: 'ghost' }));
    const cycle = __t('messages.error.cycle_detected_in_architecture_ir_dag');
    expect(await refused({ nodes: [bucket('a'), bucket('b')], edges: [edge('a', 'b'), edge('b', 'a')] })).toBe(cycle);
    expect(await refused({ nodes: [bucket('a')], edges: [edge('a', 'a')] })).toBe(cycle);
  });

  it('rejects an unsupported resource type and a provider that is not registered, for every kind', async () => {
    expect(await refused({ nodes: [{ ...bucket('a'), type: 'LAMBDA' }], edges: [] })).toBe(T('unsupported_type', { node: 'a', type: 'LAMBDA' }));
    expect(await refused({ nodes: [{ ...bucket('a'), type: 'toString' }], edges: [] })).toBe(T('unsupported_type', { node: 'a', type: 'toString' }));
    const missing = __t('fabric.contract.provider_not_registered', { provider: 'gcp' });
    for (const node of [bucket('a'), network('a'), database('a'), compute('a')]) {
      expect(await refused({ nodes: [{ ...node, provider: 'gcp' }], edges: [] })).toBe(missing);
    }
  });

  it('rejects every missing or malformed configuration field, naming the node and the field', async () => {
    const cases: Array<[any, string]> = [
      [compute('n', { instanceName: '' }), 'instanceName'], [compute('n', { instanceName: 5 }), 'instanceName'],
      [compute('n', { cpuCores: 0 }), 'cpuCores'], [compute('n', { cpuCores: 1.5 }), 'cpuCores'], [compute('n', { cpuCores: '2' }), 'cpuCores'],
      [compute('n', { memoryMb: -1 }), 'memoryMb'], [compute('n', { osImage: ' ' }), 'osImage'], [compute('n', { networkRefId: 7 }), 'networkRefId'],
      [network('n', 'abc'), 'cidrBlock'], [network('n', '10.0.0.0/33'), 'cidrBlock'], [network('n', '300.0.0.0/16'), 'cidrBlock'],
      [{ ...network('n'), config: { cidrBlock: '10.0.0.0/16' } }, 'name'],
      [database('n', { engine: 'oracle' }), 'engine'], [database('n', { capacity: 0 }), 'capacity'], [database('n', { name: '' }), 'name'],
      [{ ...bucket('n'), config: { name: 'n', storageClass: 'OBJECT', isPublic: 'no' } }, 'isPublic'], [{ ...bucket('n'), config: { name: 'n', storageClass: 'OBJECT' } }, 'isPublic'], [{ ...bucket('n'), config: { storageClass: 'OBJECT', isPublic: true } }, 'name'],
      [bucket('n', { storageClass: 'TAPE' }), 'storageClass'], [{ ...bucket('n'), config: { name: 'n', isPublic: false } }, 'storageClass'],
      [bucket('n', { publicAccessConfirmed: 'yes' }), 'publicAccessConfirmed'], [bucket('n', { storageClass: 'FILE' }), 'sizeGb'], [bucket('n', { storageClass: 'BLOCK', sizeGb: 0 }), 'sizeGb'],
      [bucket('n', { sizeGb: 1.5 }), 'sizeGb'], [compute('n', { workloadType: 'daemon' }), 'workloadType'],
    ];
    for (const [node, field] of cases) expect(await refused({ nodes: [node], edges: [] })).toBe(T('invalid_config', { node: 'n', field }));
  });

  it('accepts a networkRefId that is an unreferenced plain value and requires references to be declared dependencies', async () => {
    const plain = fakeFabric(['aws']);
    await new ProvisioningEngine(plain.registry, plain.journal).executePlan({ nodes: [compute('web', { networkRefId: 'vpc-123' })], edges: [] });
    expect(plain.calls).toEqual(['aws:create:compute:web']);

    const undeclared = { nodes: [network('net'), compute('web', { networkRefId: 'ref:net' })], edges: [] };
    expect(await refused(undeclared)).toBe(T('reference_not_declared', { node: 'web', ref: 'net' }));
    const unrelated = { nodes: [network('net'), bucket('x'), compute('web', { networkRefId: 'ref:net' })], edges: [edge('x', 'web')] };
    expect(await refused(unrelated)).toBe(T('reference_not_declared', { node: 'web', ref: 'net' }));
    const unknown = { nodes: [compute('web', { networkRefId: 'ref:missing' })], edges: [] };
    expect(await refused(unknown)).toBe(T('reference_not_declared', { node: 'web', ref: 'missing' }));
  });

  it('accepts a reference to an indirect requisite', async () => {
    const { registry, journal } = fakeFabric(['aws']);
    const ir = { nodes: [network('net'), bucket('mid'), compute('web', { networkRefId: 'ref:net' })], edges: [edge('net', 'mid'), edge('mid', 'web')] };
    expect((await new ProvisioningEngine(registry, journal).executePlan(ir)).created).toEqual(['net', 'mid', 'web']);
  });
});

describe('Plan graph helpers', () => {
  it('layers a diamond and keeps the listed order inside a layer', () => {
    const ir: any = { nodes: [bucket('d'), bucket('c'), bucket('b'), bucket('a')], edges: [edge('a', 'b'), edge('a', 'c'), edge('b', 'd'), edge('c', 'd')] };
    expect(provisioningWaves(ir).map((w) => w.map((n) => n.id))).toEqual([['a'], ['c', 'b'], ['d']]);
    expect(provisioningWaves({ nodes: [], edges: [] })).toEqual([]);
  });

  it('keeps a node back until its deepest requisite is done, even when it also depends on an earlier one', () => {
    const ir: any = { nodes: [bucket('c'), bucket('b'), bucket('a')], edges: [edge('a', 'b'), edge('b', 'c'), edge('a', 'c')] };
    expect(provisioningWaves(ir).map((w) => w.map((n) => n.id))).toEqual([['a'], ['b'], ['c']]);
  });

  it('collects direct and indirect ancestors only', () => {
    const ir: any = { nodes: [], edges: [edge('a', 'b'), edge('b', 'c'), edge('x', 'y')] };
    expect([...ancestorsOf(ir, 'c')].sort()).toEqual(['a', 'b']);
    expect([...ancestorsOf(ir, 'a')]).toEqual([]);
    expect([...ancestorsOf(ir, 'y')]).toEqual(['x']);
  });

  it('finds and resolves references, failing on an unresolved one', () => {
    const node: any = { id: 'web', type: 'COMPUTE', provider: 'aws', config: { a: 'ref:net', b: 'plain', c: 3 } };
    expect(referencesOf(node.config)).toEqual(['net']);
    expect(resolveReferences(node, new Map([['net', 'aws-network-1']]))).toEqual({ a: 'aws-network-1', b: 'plain', c: 3 });
    expect(() => resolveReferences(node, new Map())).toThrow(T('unresolved_reference', { node: 'web', ref: 'net' }));
  });

  it('fingerprints what a node asks for regardless of key order, and changes with any part of it', () => {
    const base = digestOf('NETWORK', 'aws', { name: 'n', nested: { b: 1, a: [1, { y: 1, x: 2 }] } });
    expect(digestOf('NETWORK', 'aws', { nested: { a: [1, { x: 2, y: 1 }], b: 1 }, name: 'n' })).toBe(base);
    expect(base).toHaveLength(64);
    expect(digestOf('STORAGE', 'aws', { name: 'n', nested: { b: 1, a: [1, { y: 1, x: 2 }] } })).not.toBe(base);
    expect(digestOf('NETWORK', 'linux', { name: 'n', nested: { b: 1, a: [1, { y: 1, x: 2 }] } })).not.toBe(base);
    expect(digestOf('NETWORK', 'aws', { name: 'n', nested: { b: 2, a: [1, { y: 1, x: 2 }] } })).not.toBe(base);
    const config = { name: 'n', nested: { b: 1, a: [1, { y: 1, x: 2 }] } };
    expect(digestOf('NETWORK', 'aws', config, {})).toBe(base);
    expect(digestOf('NETWORK', 'aws', config, { mode: 'VPC' })).not.toBe(base);
    expect(digestOf('NETWORK', 'aws', config, { mode: 'VPC', x: 1 })).toBe(digestOf('NETWORK', 'aws', config, { x: 1, mode: 'VPC' }));
  });

  it('validates IPv4 CIDR blocks at their boundaries', () => {
    for (const ok of ['0.0.0.0/0', '255.255.255.255/32', '10.0.0.0/16']) expect(isIpv4Cidr(ok)).toBe(true);
    for (const no of ['256.0.0.0/8', '1.2.3.4/33', '1.2.3/8', '1.2.3.4', '1.2.3.4/', 'a.b.c.d/8', ' 10.0.0.0/8']) expect(isIpv4Cidr(no)).toBe(false);
  });
});

describe('In-memory provisioning state', () => {
  it('stores copies, so neither the caller nor a reader can alter what is remembered, and forgets on remove', async () => {
    const store = new InMemoryProvisioningState();
    const record: any = { nodeId: 'n', kind: 'NETWORK', provider: 'aws', digest: 'd', resourceId: 'r1', evidence: { requested: { a: 1 }, resolved: { b: 2 } } };
    await store.put(record);
    record.resourceId = 'changed';
    record.evidence.requested.a = 'changed';
    const read: any = await store.get('n');
    expect(read.resourceId).toBe('r1');
    expect(read.evidence).toEqual({ requested: { a: 1 }, resolved: { b: 2 } });
    read.resourceId = 'tampered';
    expect((await store.get('n'))?.resourceId).toBe('r1');
    await store.remove('n');
    expect(await store.get('n')).toBeUndefined();
  });
});
