/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric — Capability Contract
 * File           : CapabilityEvaluation.ts
 * Version        : 1.0.0
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

import type { DatabaseConfig } from '../capabilities/database';
import type { StorageConfig } from '../capabilities/storage';
import type { EnginePolicy, NodeKind, PlanRejection, ProvisioningNode, RejectionCode } from '../engine/ProvisioningTypes';
import type { ProviderCapabilities } from './ProviderContract';

const NONE = '-';
const listOf = (values: ReadonlyArray<string>): string => (values.length === 0 ? NONE : values.join(', '));

/** The provider mode a node asks for, if any. */
export const modeOf = (node: ProvisioningNode): string | undefined => {
  const mode = node.providerOptions?.mode;
  return mode === undefined ? undefined : String(mode);
};

/**
 * Decides, without calling the provider, whether the provider can faithfully implement a node. A provider that cannot
 * is never approximated: every reason it cannot is returned so the user fixes the plan once.
 */
export function evaluateCapabilities(node: ProvisioningNode, kind: NodeKind, typed: unknown, contract: ProviderCapabilities, policy: EnginePolicy): PlanRejection[] {
  const rejections: PlanRejection[] = [];
  const declared = contract.kinds[kind];
  const provider = contract.provider;
  const reject = (code: RejectionCode, reason: string, alternativeKeys: ReadonlyArray<string>): void => {
    rejections.push({ nodeId: node.id, provider, kind, code, reason, alternatives: alternativeKeys.map((key) => __t(key)) });
  };

  if (declared.status === 'UNSUPPORTED') {
    reject('KIND_UNSUPPORTED', __t(declared.reasonKey ?? 'fabric.contract.reason.generic', { provider, kind }), declared.alternativeKeys ?? []);
    return rejections;
  }

  const mode = modeOf(node);
  if (mode === undefined) {
    if (declared.status === 'CONDITIONAL') reject('MODE_REQUIRED', __t('fabric.contract.rejection.mode_required', { provider, kind, modes: listOf(declared.modes) }), ['fabric.contract.alt.set_provider_mode', ...(declared.alternativeKeys ?? [])]);
  } else if (!declared.modes.includes(mode)) {
    reject('MODE_UNSUPPORTED', __t('fabric.contract.rejection.mode_unsupported', { provider, kind, mode, modes: listOf(declared.modes) }), ['fabric.contract.alt.set_provider_mode']);
  }

  if (kind === 'DATABASE') {
    const { engine } = typed as DatabaseConfig;
    if (!contract.databaseEngines.includes(engine)) reject('DATABASE_ENGINE_UNSUPPORTED', __t('fabric.contract.rejection.database_engine_unsupported', { provider, engine, engines: listOf(contract.databaseEngines) }), ['fabric.contract.alt.use_supported_engine']);
  }
  if (kind === 'STORAGE') evaluateStorage(typed as StorageConfig, node, contract, policy, reject);
  return rejections;
}

function evaluateStorage(cfg: StorageConfig, node: ProvisioningNode, contract: ProviderCapabilities, policy: EnginePolicy, reject: (code: RejectionCode, reason: string, alternativeKeys: ReadonlyArray<string>) => void): void {
  const provider = contract.provider;
  if (!contract.storageClasses.includes(cfg.storageClass)) {
    reject('STORAGE_CLASS_UNSUPPORTED', __t('fabric.contract.rejection.storage_class_unsupported', { provider, storageClass: cfg.storageClass, classes: listOf(contract.storageClasses) }), ['fabric.contract.alt.use_supported_storage_class']);
    return;
  }
  if (!cfg.isPublic) return;
  if (!contract.publicStorageClasses.includes(cfg.storageClass)) {
    reject('PUBLIC_STORAGE_UNSUPPORTED', __t('fabric.contract.rejection.public_storage_unsupported', { provider, storageClass: cfg.storageClass }), ['fabric.contract.alt.make_storage_private']);
  } else if (policy.allowPublicStorage !== true) {
    reject('PUBLIC_STORAGE_PROHIBITED', __t('fabric.contract.rejection.public_storage_prohibited', { node: node.id }), ['fabric.contract.alt.make_storage_private', 'fabric.contract.alt.allow_public_storage_policy']);
  } else if (cfg.publicAccessConfirmed !== true) {
    reject('PUBLIC_STORAGE_UNCONFIRMED', __t('fabric.contract.rejection.public_storage_unconfirmed', { node: node.id }), ['fabric.contract.alt.make_storage_private', 'fabric.contract.alt.confirm_public_access']);
  }
}
