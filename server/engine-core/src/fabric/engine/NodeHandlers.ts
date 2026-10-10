import { Logger } from '@ugondu/shared';
/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric — Provisioning Engine
 * File           : NodeHandlers.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/
// @ts-ignore
import { __t } from '@ugondu/shared';

import { FabricRegistry } from '../registry';
import type { ComputeConfig, ProviderOptions, ResolvedValues } from '../capabilities/compute';
import type { NetworkConfig } from '../capabilities/network';
import { DATABASE_ENGINES } from '../capabilities/database';
import type { DatabaseConfig } from '../capabilities/database';
import { STORAGE_CLASSES } from '../capabilities/storage';
import type { StorageConfig } from '../capabilities/storage';
import type { NodeKind } from './ProvisioningTypes';

/** What a successful provider call yields: the identity of the resource and what the provider resolved. */
export interface ProvisionOutcome {
  resourceId: string;
  resolved: ResolvedValues;
}

/** How one resource kind is validated, created and removed through the fabric. */
export interface NodeHandler<C = unknown> {
  /** Checks the configuration and returns it typed; throws a localized error naming the node and the field. */
  validate(nodeId: string, config: Record<string, unknown>): C;
  provision(registry: FabricRegistry, provider: string, config: C, options: ProviderOptions): Promise<ProvisionOutcome>;
  deprovision(registry: FabricRegistry, provider: string, resourceId: string): Promise<void>;
}

const bad = (nodeId: string, field: string): Error => new Error(__t('fabric.engine.invalid_config', { node: nodeId, field }));

const text = (nodeId: string, config: Record<string, unknown>, field: string): string => {
  const value = config[field];
  if (typeof value !== 'string' || value.trim() === '') throw bad(nodeId, field);
  return value;
};

const count = (nodeId: string, config: Record<string, unknown>, field: string): number => {
  const value = config[field];
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) throw bad(nodeId, field);
  return value;
};

const flag = (nodeId: string, config: Record<string, unknown>, field: string): boolean => {
  const value = config[field];
  if (typeof value !== 'boolean') throw bad(nodeId, field);
  return value;
};

const IPV4_CIDR = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;

/** A CIDR block with four octets of 0-255 and a prefix of 0-32. */
export function isIpv4Cidr(value: string): boolean {
  const m = IPV4_CIDR.exec(value);
  return m !== null && m.slice(1, 5).every((o) => Number(o) <= 255) && Number(m[5]) <= 32;
}

/** Fails when the provider reports a state other than success, so a half-created resource is never recorded as healthy. */
function created(result: { id: string; resolved?: ResolvedValues }, nodeId: string): ProvisionOutcome {
  if (!result.id) throw new Error(__t('fabric.engine.no_resource_id', { node: nodeId }));
  return { resourceId: result.id, resolved: { ...(result.resolved ?? {}) } };
}

export const NODE_HANDLERS: Record<NodeKind, NodeHandler<any>> = {
  COMPUTE: {
    validate: (id, c): ComputeConfig => {
      const cfg: ComputeConfig = { instanceName: text(id, c, 'instanceName'), cpuCores: count(id, c, 'cpuCores'), memoryMb: count(id, c, 'memoryMb'), osImage: text(id, c, 'osImage') };
      if (c.networkRefId !== undefined) cfg.networkRefId = text(id, c, 'networkRefId');
      if (c.workloadType !== undefined) {
        if (c.workloadType !== 'stateless' && c.workloadType !== 'stateful') throw bad(id, 'workloadType');
        cfg.workloadType = c.workloadType;
      }
      return cfg;
    },
    provision: async (r, p, cfg: ComputeConfig, options) => {
      const adapter = r.resolveCompute(p);
      const result = await adapter.provisionInstance(cfg, options);
      if (result.state === 'failed') {
        if (result.id) await adapter.terminateInstance(result.id).catch((e) => Logger.warn(__t('suppressed_error_during_termination') + String(e)));
        throw new Error(__t('fabric.engine.provider_reported_failure', { node: cfg.instanceName }));
      }
      return created(result, cfg.instanceName);
    },
    deprovision: (r, p, id) => r.resolveCompute(p).terminateInstance(id),
  },
  NETWORK: {
    validate: (id, c): NetworkConfig => {
      const cidrBlock = text(id, c, 'cidrBlock');
      if (!isIpv4Cidr(cidrBlock)) throw bad(id, 'cidrBlock');
      return { name: text(id, c, 'name'), cidrBlock };
    },
    provision: async (r, p, cfg: NetworkConfig, options) => created(await r.resolveNetwork(p).createVirtualNetwork(cfg, options), cfg.name),
    deprovision: (r, p, id) => r.resolveNetwork(p).deleteVirtualNetwork(id),
  },
  DATABASE: {
    validate: (id, c): DatabaseConfig => {
      const engine = c.engine as DatabaseConfig['engine'];
      if (!DATABASE_ENGINES.includes(engine)) throw bad(id, 'engine');
      const cfg: DatabaseConfig = { name: text(id, c, 'name'), engine, capacity: count(id, c, 'capacity') };
      if (c.credentialsRef !== undefined) cfg.credentialsRef = text(id, c, 'credentialsRef');
      return cfg;
    },
    provision: async (r, p, cfg: DatabaseConfig, options) => created(await r.resolveDatabase(p).provisionDatabase(cfg, options), cfg.name),
    deprovision: (r, p, id) => r.resolveDatabase(p).deprovisionDatabase(id),
  },
  STORAGE: {
    validate: (id, c): StorageConfig => {
      const storageClass = c.storageClass as StorageConfig['storageClass'];
      if (!STORAGE_CLASSES.includes(storageClass)) throw bad(id, 'storageClass');
      const cfg: StorageConfig = { name: text(id, c, 'name'), storageClass, isPublic: flag(id, c, 'isPublic') };
      if (c.publicAccessConfirmed !== undefined) cfg.publicAccessConfirmed = flag(id, c, 'publicAccessConfirmed');
      if (storageClass !== 'OBJECT' || c.sizeGb !== undefined) cfg.sizeGb = count(id, c, 'sizeGb');
      return cfg;
    },
    provision: async (r, p, cfg: StorageConfig, options) => created(await r.resolveStorage(p).provisionStorage(cfg, options), cfg.name),
    deprovision: (r, p, id) => r.resolveStorage(p).deprovisionStorage(id),
  },
};

export const isNodeKind = (type: string): type is NodeKind => Object.prototype.hasOwnProperty.call(NODE_HANDLERS, type);
