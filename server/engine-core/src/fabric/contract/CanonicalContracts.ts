/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric — Capability Contract
 * File           : CanonicalContracts.ts
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
import type { ProviderCapabilities } from './ProviderContract';

/**
 * The frozen capability matrix of ugondu_provider_fabric_blueprint_v2 (section 4). Adapters register with these
 * declarations; changing one is a blueprint change, not an adapter decision.
 */

const ALTERNATIVES_NO_DATABASE = ['fabric.contract.alt.install_plugin', 'fabric.contract.alt.target_managed_provider', 'fabric.contract.alt.remove_resource'] as const;
const ALTERNATIVES_NO_NETWORK = ['fabric.contract.alt.target_network_provider', 'fabric.contract.alt.remove_resource'] as const;

export const AWS_CONTRACT: ProviderCapabilities = {
  provider: 'aws',
  kinds: {
    COMPUTE: { status: 'NATIVE', modes: ['INSTANCE'] },
    NETWORK: { status: 'NATIVE', modes: ['VPC'] },
    DATABASE: { status: 'NATIVE', modes: [] },
    STORAGE: { status: 'NATIVE', modes: [] },
  },
  databaseEngines: ['postgres', 'mysql'],
  storageClasses: ['OBJECT'],
  publicStorageClasses: ['OBJECT'],
  supportsDryRun: true, supportsRollback: true, supportsIdempotency: true, supportsImport: false, supportsUpdate: false, supportsDelete: true,
};

export const KUBERNETES_CONTRACT: ProviderCapabilities = {
  provider: 'kubernetes',
  kinds: {
    COMPUTE: { status: 'NATIVE', modes: ['DEPLOYMENT', 'STATEFULSET'] },
    NETWORK: { status: 'CONDITIONAL', modes: ['NETWORK_POLICY'], reasonKey: 'fabric.contract.reason.kubernetes_network', alternativeKeys: ['fabric.contract.alt.use_network_policy_mode', 'fabric.contract.alt.target_network_provider'] },
    DATABASE: { status: 'UNSUPPORTED', modes: [], reasonKey: 'fabric.contract.reason.kubernetes_database', alternativeKeys: ALTERNATIVES_NO_DATABASE },
    STORAGE: { status: 'CONDITIONAL', modes: ['PVC'], reasonKey: 'fabric.contract.reason.kubernetes_storage', alternativeKeys: ['fabric.contract.alt.use_file_or_block_class', 'fabric.contract.alt.target_object_storage_provider'] },
  },
  databaseEngines: [],
  storageClasses: ['FILE', 'BLOCK'],
  publicStorageClasses: [],
  supportsDryRun: true, supportsRollback: true, supportsIdempotency: true, supportsImport: false, supportsUpdate: false, supportsDelete: true,
};

export const LINUX_CONTRACT: ProviderCapabilities = {
  provider: 'linux',
  kinds: {
    COMPUTE: { status: 'NATIVE', modes: ['SYSTEMD', 'CONTAINER'] },
    NETWORK: { status: 'CONDITIONAL', modes: ['EXISTING', 'NETWORKMANAGER', 'SYSTEMD_NETWORKD', 'NETPLAN'], reasonKey: 'fabric.contract.reason.linux_network', alternativeKeys: ['fabric.contract.alt.declare_network_backend', 'fabric.contract.alt.target_network_provider'] },
    DATABASE: { status: 'UNSUPPORTED', modes: [], reasonKey: 'fabric.contract.reason.linux_database', alternativeKeys: ALTERNATIVES_NO_DATABASE },
    STORAGE: { status: 'NATIVE', modes: ['DIRECTORY'] },
  },
  databaseEngines: [],
  storageClasses: ['FILE'],
  publicStorageClasses: [],
  supportsDryRun: true, supportsRollback: true, supportsIdempotency: true, supportsImport: false, supportsUpdate: false, supportsDelete: true,
};

export const CPANEL_CONTRACT: ProviderCapabilities = {
  provider: 'cpanel',
  kinds: {
    COMPUTE: { status: 'CONDITIONAL', modes: ['HOSTED_APP'], reasonKey: 'fabric.contract.reason.cpanel_compute', alternativeKeys: ['fabric.contract.alt.use_hosted_app_mode', 'fabric.contract.alt.target_compute_provider'] },
    NETWORK: { status: 'UNSUPPORTED', modes: [], reasonKey: 'fabric.contract.reason.cpanel_network', alternativeKeys: ALTERNATIVES_NO_NETWORK },
    DATABASE: { status: 'CONDITIONAL', modes: ['MYSQL'], reasonKey: 'fabric.contract.reason.cpanel_database', alternativeKeys: ['fabric.contract.alt.use_mysql_mode', 'fabric.contract.alt.target_managed_provider'] },
    STORAGE: { status: 'CONDITIONAL', modes: ['ACCOUNT_FILESYSTEM'], reasonKey: 'fabric.contract.reason.cpanel_storage', alternativeKeys: ['fabric.contract.alt.use_file_class', 'fabric.contract.alt.target_object_storage_provider'] },
  },
  databaseEngines: ['mysql'],
  storageClasses: ['FILE'],
  publicStorageClasses: [],
  supportsDryRun: false, supportsRollback: true, supportsIdempotency: true, supportsImport: false, supportsUpdate: false, supportsDelete: true,
};

export const CANONICAL_CONTRACTS: Readonly<Record<string, ProviderCapabilities>> = {
  aws: AWS_CONTRACT,
  kubernetes: KUBERNETES_CONTRACT,
  linux: LINUX_CONTRACT,
  cpanel: CPANEL_CONTRACT,
};
