/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric — test support
 * File           : fakeCloud.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : INTERNAL
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { FabricRegistry } from '../../registry';
import type { ProviderAdapters } from '../../registry';
import { CANONICAL_CONTRACTS } from '../../contract/CanonicalContracts';
import { NODE_KINDS } from '../../contract/ProviderContract';
import type { ProviderCapabilities } from '../../contract/ProviderContract';
import type { ComputeCapability, ComputeConfig, ProviderOptions } from '../../capabilities/compute';
import type { NetworkCapability, NetworkConfig } from '../../capabilities/network';
import type { DatabaseCapability, DatabaseConfig } from '../../capabilities/database';
import type { StorageCapability, StorageConfig } from '../../capabilities/storage';
import type { IJournal, UrreJournalEntry } from '../../engine/ProvisioningTypes';

type Kind = 'compute' | 'network' | 'database' | 'storage';
type Live = { kind: Kind; config: any; options: ProviderOptions };

/** A provider that supports every kind natively with every engine and class; used where the contract is not the subject. */
export const nativeContract = (provider: string): ProviderCapabilities => ({
  provider,
  kinds: { COMPUTE: { status: 'NATIVE', modes: [] }, NETWORK: { status: 'NATIVE', modes: [] }, DATABASE: { status: 'NATIVE', modes: [] }, STORAGE: { status: 'NATIVE', modes: [] } },
  databaseEngines: ['postgres', 'mysql', 'document'],
  storageClasses: ['OBJECT', 'FILE', 'BLOCK'],
  publicStorageClasses: ['OBJECT'],
  supportsDryRun: true, supportsRollback: true, supportsIdempotency: true, supportsImport: false, supportsUpdate: false, supportsDelete: true,
});

/** The frozen contract of a real provider, or the all-native one for any other name. */
export const canonicalOrNative = (provider: string): ProviderCapabilities => CANONICAL_CONTRACTS[provider] ?? nativeContract(provider);

/**
 * In-memory provider that enforces the rules a real one does: a network that still hosts an instance cannot be
 * deleted, nothing can be deleted twice, and every create/delete is recorded in call order. Dry runs are recorded
 * separately so a test can prove that previewing a plan changes nothing.
 */
export function fakeCloud(provider: string, shared: { calls: string[]; dryRuns: string[]; live: Map<string, Live> }) {
  let counter = 0;
  const failing = new Set<string>();
  const stuck = new Set<string>();
  const nextId = (kind: Kind): string => `${provider}-${kind}-${++counter}`;
  const create = (kind: Kind, name: string, config: any, options: ProviderOptions): string => {
    shared.calls.push(`${provider}:create:${kind}:${name}`);
    if (failing.has(`${kind}:${name}`)) throw new Error(`injected failure: ${kind}:${name}`);
    const id = nextId(kind);
    shared.live.set(id, { kind, config, options });
    return id;
  };
  const remove = (kind: Kind, id: string): void => {
    shared.calls.push(`${provider}:delete:${kind}:${id}`);
    if (stuck.has(id)) throw new Error(`injected delete failure: ${id}`);
    const entry = shared.live.get(id);
    if (!entry || entry.kind !== kind) throw new Error(`no such ${kind}: ${id}`);
    if (kind === 'network') {
      for (const other of shared.live.values()) if (other.kind === 'compute' && other.config.networkRefId === id) throw new Error(`network ${id} still hosts an instance`);
    }
    shared.live.delete(id);
  };
  const sizing = (c: ComputeConfig) => ({ instanceType: `fake-${c.cpuCores}x${c.memoryMb}` });

  const compute: ComputeCapability = {
    provisionInstance: async (c: ComputeConfig, o) => ({ id: create('compute', c.instanceName, c, o), state: c.osImage === 'broken' ? 'failed' as const : 'running' as const, resolved: sizing(c) }),
    terminateInstance: async (id) => remove('compute', id),
    getInstanceStatus: async (id) => ({ id, state: shared.live.has(id) ? 'running' : 'terminated', health: 'healthy' }),
    resolveSizing: async (c: ComputeConfig) => { shared.dryRuns.push(`${provider}:sizing:${c.instanceName}`); return sizing(c); },
  };
  const network: NetworkCapability = {
    createVirtualNetwork: async (c: NetworkConfig, o) => ({ id: create('network', c.name, c, o), state: 'available' }),
    deleteVirtualNetwork: async (id) => remove('network', id),
    createSubnet: async (networkId, cidr) => ({ id: nextId('network'), cidr }),
  };
  const database: DatabaseCapability = {
    provisionDatabase: async (c: DatabaseConfig, o) => ({ id: create('database', c.name, c, o), connectionString: `db://${c.name}` }),
    deprovisionDatabase: async (id) => remove('database', id),
    createSnapshot: async (id) => `snap-${id}`,
  };
  const storage: StorageCapability = {
    provisionStorage: async (c: StorageConfig, o) => ({ id: create('storage', c.name, c, o), endpoint: `https://${c.name}`, resolved: { storageClass: c.storageClass } }),
    deprovisionStorage: async (id) => remove('storage', id),
  };
  return {
    compute, network, database, storage,
    failCreate: (kind: Kind, name: string) => { failing.add(`${kind}:${name}`); },
    failDelete: (id: string) => { stuck.add(id); },
  };
}

/** Registers each provider with its contract and a fake adapter for every kind the contract does not declare UNSUPPORTED. */
export function fakeFabric(providers: string[] = ['aws'], contractFor: (provider: string) => ProviderCapabilities = nativeContract) {
  const shared = { calls: [] as string[], dryRuns: [] as string[], live: new Map<string, Live>() };
  const registry = new FabricRegistry();
  const clouds: Record<string, ReturnType<typeof fakeCloud>> = {};
  for (const p of providers) {
    const cloud = fakeCloud(p, shared);
    clouds[p] = cloud;
    const contract = contractFor(p);
    const all: Record<string, ProviderAdapters[keyof ProviderAdapters]> = { COMPUTE: cloud.compute, NETWORK: cloud.network, DATABASE: cloud.database, STORAGE: cloud.storage };
    const adapters: Record<string, unknown> = {};
    for (const kind of NODE_KINDS) if (contract.kinds[kind].status !== 'UNSUPPORTED') adapters[kind] = all[kind];
    registry.registerProvider(contract, adapters as ProviderAdapters);
  }
  const entries: Array<Omit<UrreJournalEntry, 'transactionId'>> = [];
  const journal: IJournal = { log: async (e) => { entries.push(e); } };
  return { registry, journal, entries, clouds, calls: shared.calls, dryRuns: shared.dryRuns, live: shared.live };
}

/** The four real providers, registered with their frozen contracts. */
export const canonicalFabric = () => fakeFabric(['aws', 'kubernetes', 'linux', 'cpanel'], canonicalOrNative);

const mode = (m?: string) => (m === undefined ? {} : { providerOptions: { mode: m } });

export const compute = (id: string, extra: Record<string, unknown> = {}, provider = 'aws', m?: string) => ({ id, type: 'COMPUTE', provider, config: { instanceName: id, cpuCores: 2, memoryMb: 2048, osImage: 'ubuntu-24.04', ...extra }, ...mode(m) });
export const network = (id: string, cidrBlock = '10.0.0.0/16', provider = 'aws', m?: string) => ({ id, type: 'NETWORK', provider, config: { name: id, cidrBlock }, ...mode(m) });
export const database = (id: string, extra: Record<string, unknown> = {}, provider = 'aws', m?: string) => ({ id, type: 'DATABASE', provider, config: { name: id, engine: 'postgres', capacity: 20, ...extra }, ...mode(m) });
export const bucket = (id: string, extra: Record<string, unknown> = {}, provider = 'aws', m?: string) => ({ id, type: 'STORAGE', provider, config: { name: id, storageClass: 'OBJECT', isPublic: false, ...extra }, ...mode(m) });
