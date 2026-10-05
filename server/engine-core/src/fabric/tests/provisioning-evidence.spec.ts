/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Provider Fabric — Evidence, provider modes and plan preview
 * File           : provisioning-evidence.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { ProvisioningEngine, InMemoryProvisioningState } from '../provisioning-engine';
import { canonicalFabric, compute, network, database, bucket } from './support/fakeCloud';
// @ts-ignore
import { __t } from '../../../../shared/i18n';

declare var describe: any, it: any, expect: any;

const E = (key: string, params?: Record<string, string | number>): string => __t(`fabric.engine.${key}`, params);
const failure = async (run: () => Promise<any>): Promise<any> => { try { await run(); return undefined; } catch (e) { return e; } };

function setup() {
  const fabric = canonicalFabric();
  const state = new InMemoryProvisioningState();
  return { ...fabric, state, engine: new ProvisioningEngine(fabric.registry, fabric.journal, state) };
}

describe(__t('every_mutation_yields_evidence'), () => {
  it(__t('records_what_was_requested_wha'), async () => {
    const { engine, state, entries } = setup();
    const report = await engine.executePlan({ nodes: [compute('web', { cpuCores: 4, memoryMb: 8192 })], edges: [] });
    const evidence = { requested: { instanceName: 'web', cpuCores: 4, memoryMb: 8192, osImage: 'ubuntu-24.04' }, resolved: { instanceType: 'fake-4x8192' } };

    expect(report.provisioned[0]).toMatchObject({ nodeId: 'web', kind: 'COMPUTE', provider: 'aws', resourceId: 'aws-compute-1', evidence });
    expect((await state.get('web'))?.evidence).toEqual(evidence);
    const success = entries.find((e) => e.status === 'success');
    expect(success).toMatchObject({ nodeId: 'web', resourceId: 'aws-compute-1', evidence });
    expect(entries.find((e) => e.status === 'pending')?.evidence).toBeUndefined();
  });

  it(__t('records_an_empty_resolution_wh'), async () => {
    const { engine } = setup();
    const report = await engine.executePlan({ nodes: [network('net'), bucket('assets')], edges: [] });
    const byId = Object.fromEntries(report.provisioned.map((r) => [r.nodeId, r.evidence]));
    expect(byId.net).toEqual({ requested: { name: 'net', cidrBlock: '10.0.0.0/16' }, resolved: {} });
    expect(byId.assets).toEqual({ requested: { name: 'assets', storageClass: 'OBJECT', isPublic: false }, resolved: { storageClass: 'OBJECT' } });
  });

  it(__t('shows_the_resolved_reference_i'), async () => {
    const { engine } = setup();
    const report = await engine.executePlan({ nodes: [network('net'), compute('web', { networkRefId: 'ref:net' })], edges: [{ from: 'net', to: 'web' }] });
    expect(report.provisioned[1]!.evidence.requested.networkRefId).toBe('aws-network-1');
  });

  it(__t('returns_the_remembered_evidenc'), async () => {
    const { engine, calls, entries } = setup();
    const ir = { nodes: [compute('web', { cpuCores: 4, memoryMb: 8192 })], edges: [] };
    const first = await engine.executePlan(ir);
    const second = await engine.executePlan(ir);
    expect(calls.length).toBe(1);
    expect(second.provisioned[0]!.evidence).toEqual(first.provisioned[0]!.evidence);
    expect(entries.filter((e) => e.status === 'skipped')[0]?.evidence).toEqual(first.provisioned[0]!.evidence);
  });

  it(__t('does_not_let_a_caller_alter_th'), async () => {
    const { engine, state } = setup();
    const report = await engine.executePlan({ nodes: [compute('web')], edges: [] });
    (report.provisioned[0]!.evidence.resolved as any).instanceType = 'tampered';
    const remembered = await state.get('web');
    expect(remembered?.evidence.resolved.instanceType).toBe('fake-2x2048');
    (remembered!.evidence.requested as any).cpuCores = 99;
    expect((await state.get('web'))?.evidence.requested.cpuCores).toBe(2);
    expect(remembered?.digest).toHaveLength(64);
  });
});

describe(__t('provider_modes_reach_the_adapt'), () => {
  it(__t('hands_the_declared_mode_and_th'), async () => {
    const { engine, live } = setup();
    await engine.executePlan({ nodes: [compute('web', {}, 'kubernetes', 'DEPLOYMENT'), compute('db', { workloadType: 'stateful' }, 'kubernetes', 'STATEFULSET')], edges: [] });
    expect(live.get('kubernetes-compute-1')?.options).toEqual({ mode: 'DEPLOYMENT' });
    expect(live.get('kubernetes-compute-2')?.options).toEqual({ mode: 'STATEFULSET' });
    expect(live.get('kubernetes-compute-2')?.config.workloadType).toBe('stateful');
  });

  it(__t('treats_the_same_node_with_anot'), async () => {
    const { engine, calls } = setup();
    await engine.executePlan({ nodes: [compute('web', {}, 'kubernetes', 'DEPLOYMENT')], edges: [] });
    const error = await failure(() => engine.executePlan({ nodes: [compute('web', {}, 'kubernetes', 'STATEFULSET')], edges: [] }));
    expect(error.cause.message).toBe(E('state_conflict', { node: 'web' }));
    expect(calls).toEqual(['kubernetes:create:compute:web']);
  });

  it(__t('keeps_a_plan_idempotent_when_o'), async () => {
    const { engine, calls } = setup();
    const node = (options: any) => ({ ...compute('web', {}, 'aws'), providerOptions: options });
    await engine.executePlan({ nodes: [node({ mode: 'INSTANCE', zone: 'a' })], edges: [] });
    const report = await engine.executePlan({ nodes: [node({ zone: 'a', mode: 'INSTANCE' })], edges: [] });
    expect(report.unchanged).toEqual(['web']);
    expect(calls.length).toBe(1);
  });
});

describe(__t('preview_shows_the_plan_without'), () => {
  it(__t('resolves_sizing_through_a_dry_'), async () => {
    const { engine, calls, entries, dryRuns, live } = setup();
    const plan = await engine.preview({ nodes: [compute('web', { cpuCores: 4, memoryMb: 8192 }, 'aws', 'INSTANCE'), network('net'), bucket('assets')], edges: [] });
    expect(plan.accepted).toBe(true);
    expect(plan.rejections).toEqual([]);
    expect(plan.nodes).toEqual([
      { nodeId: 'web', kind: 'COMPUTE', provider: 'aws', capability: 'NATIVE', mode: 'INSTANCE', requested: { instanceName: 'web', cpuCores: 4, memoryMb: 8192, osImage: 'ubuntu-24.04' }, resolved: { instanceType: 'fake-4x8192' } },
      { nodeId: 'net', kind: 'NETWORK', provider: 'aws', capability: 'NATIVE', requested: { name: 'net', cidrBlock: '10.0.0.0/16' } },
      { nodeId: 'assets', kind: 'STORAGE', provider: 'aws', capability: 'NATIVE', requested: { name: 'assets', storageClass: 'OBJECT', isPublic: false } },
    ]);
    expect(dryRuns).toEqual(['aws:sizing:web']);
    expect(calls).toEqual([]);
    expect(entries).toEqual([]);
    expect(live.size).toBe(0);
  });

  it(__t('never_dry_runs_on_a_provider_t'), async () => {
    const { engine, dryRuns } = setup();
    const plan = await engine.preview({ nodes: [compute('site', {}, 'cpanel', 'HOSTED_APP')], edges: [] });
    expect(plan.nodes[0]).toEqual({ nodeId: 'site', kind: 'COMPUTE', provider: 'cpanel', capability: 'CONDITIONAL', mode: 'HOSTED_APP', requested: { instanceName: 'site', cpuCores: 2, memoryMb: 2048, osImage: 'ubuntu-24.04' } });
    expect(dryRuns).toEqual([]);
  });

  it(__t('previews_without_a_resolution_'), async () => {
    const { engine, clouds } = setup();
    delete (clouds.aws!.compute as any).resolveSizing;
    const plan = await engine.preview({ nodes: [compute('web')], edges: [] });
    expect(plan.accepted).toBe(true);
    expect(plan.nodes[0]!.resolved).toBeUndefined();
  });

  it(__t('reports_why_a_plan_would_be_re'), async () => {
    const { engine, calls, entries } = setup();
    const plan = await engine.preview({ nodes: [bucket('ok'), database('db', {}, 'kubernetes')], edges: [] });
    expect(plan.accepted).toBe(false);
    expect(plan.nodes.map((n) => n.nodeId)).toEqual(['ok']);
    expect(plan.rejections.map((r) => [r.nodeId, r.code])).toEqual([['db', 'KIND_UNSUPPORTED']]);
    expect(calls).toEqual([]);
    expect(entries).toEqual([]);
  });

  it(__t('applies_the_same_structural_ch'), async () => {
    const { engine } = setup();
    const error = await failure(() => engine.preview({ nodes: [bucket('a'), bucket('a')], edges: [] }));
    expect(error.message).toBe(E('duplicate_node', { node: 'a' }));
    expect((await failure(() => engine.preview({ nodes: [{ ...bucket('a'), provider: 'gcp' }], edges: [] }))).message).toBe(__t('fabric.contract.provider_not_registered', { provider: 'gcp' }));
  });

  it(__t('previews_an_empty_plan_as_acce'), async () => {
    expect(await setup().engine.preview({ nodes: [], edges: [] })).toEqual({ accepted: true, nodes: [], rejections: [] });
  });
});
