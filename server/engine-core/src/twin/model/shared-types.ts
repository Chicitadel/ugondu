/******************************************************************************
 * Project        : Ugondu
 * Module         : Server / Engine Core / Twin
 * File           : shared-types.ts
 * Version        : 1.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

export type CapabilityAvailabilityState =
  | 'AVAILABLE'
  | 'UNAVAILABLE'
  | 'ACCOUNT_SCOPED'
  | 'UNSUPPORTED'
  | 'UNKNOWN';

export interface DirectAdminCapabilityReport {
  php: CapabilityAvailabilityState;
  phpVersion: string;
  domains: CapabilityAvailabilityState;
  subdomains: CapabilityAvailabilityState;
  database: CapabilityAvailabilityState;
  dnsManagement: CapabilityAvailabilityState;
  tls: CapabilityAvailabilityState;
  ftp: CapabilityAvailabilityState;
  filesystem: CapabilityAvailabilityState;
  kubernetes: CapabilityAvailabilityState;
  rootAccess: CapabilityAvailabilityState;
  docker: CapabilityAvailabilityState;
  ssh: CapabilityAvailabilityState;
  nodejs: CapabilityAvailabilityState;
  cron: CapabilityAvailabilityState;
  redis: CapabilityAvailabilityState;
  resourceLimits: CapabilityAvailabilityState;
  systemd: CapabilityAvailabilityState;
  privateNetworking: CapabilityAvailabilityState;
}

export interface ApplicationDiscovery {
  language: string;
  framework: string | null;
  runtime: string;
  entrypoint: string | null;
  ports: number[];
  packageManager: string | null;
  buildSystem: string | null;
  envVars: string[];
  secretRefs: string[];
  externalDependencies: string[];
  containerized: boolean;
}

/**
 * @interface HostDiscovery
 * @description Corporate Governed interface implementation for HostDiscovery
 * @classification ENTERPRISE
 */
export interface HostDiscovery {
  os: string;
  cpuCores: number;
  ramMb: number;
  diskMb: number;
  processes: string[];
  services: string[];
  packages: Array<{ name: string; version: string }>;
  users: string[];
  firewallRules: string[];
  certificates: Array<{ domain: string; expiresAt: number }>;
  cronJobs: string[];
  containers: string[];
}

/**
 * @interface CloudDiscovery
 * @description Corporate Governed interface implementation for CloudDiscovery
 * @classification ENTERPRISE
 */
export interface CloudDiscovery {
  provider: string;
  accountId: string;
  region: string;
  vpcs: string[];
  subnets: string[];
  computeInstances: string[];
  databases: string[];
  storageBuckets: string[];
  iamRoles: string[];
  dnsZones: string[];
  loadBalancers: string[];
  certificates: string[];
}

/**
 * @interface KubernetesDiscovery
 * @description Corporate Governed interface implementation for KubernetesDiscovery
 * @classification ENTERPRISE
 */
export interface KubernetesDiscovery {
  clusterName: string;
  namespaces: string[];
  deployments: string[];
  services: string[];
  ingresses: string[];
  configMaps: string[];
  secretNames: string[];
  pvcs: string[];
  nodeCount: number;
}

/**
 * @interface HostingPanelDiscovery
 * @description Corporate Governed interface implementation for HostingPanelDiscovery
 * @classification ENTERPRISE
 */
export interface HostingPanelDiscovery {
  panel: 'cpanel' | 'plesk' | 'directadmin' | 'unknown';
  domains: string[];
  subdomains?: string[];
  applications: string[];
  databases: string[];
  sslCertificates: Array<{ domain: string; expiresAt: number }>;
  dnsZones: string[];
  cronJobs: string[];
  diskUsageMb: number;
  phpVersion?: string;
  capabilities?: DirectAdminCapabilityReport;
}

export type KnowledgeState =
  | 'OBSERVED' | 'DECLARED' | 'INFERRED'
  | 'DESIRED' | 'PLANNED' | 'APPLIED' | 'VERIFIED';

export type ResourceLifecycleState =
  | 'DISCOVERED' | 'MODELLED' | 'PLANNED' | 'PROVISIONED'
  | 'DEPLOYED' | 'VERIFIED' | 'HEALTHY' | 'DEGRADED' | 'RECOVERING';

/**
 * @interface TwinResource
 * @description Corporate Governed interface implementation for TwinResource
 * @classification ENTERPRISE
 */
export interface TwinResource {
  resourceId: string;
  type: string;
  knowledgeState: KnowledgeState;
  lifecycleState: ResourceLifecycleState;
  metadata: Record<string, string>;
  lastObservedAt: number | null;
  lastVerifiedAt: number | null;
}

/**
 * @interface DependencyEdge
 * @description Corporate Governed interface implementation for DependencyEdge
 * @classification ENTERPRISE
 */
export interface DependencyEdge {
  fromResourceId: string;
  toResourceId: string;
  dependencyType: string;
  verified: boolean;
}

/**
 * @interface EnvironmentTwin
 * @description Corporate Governed interface implementation for EnvironmentTwin
 * @classification ENTERPRISE
 */
export interface EnvironmentTwin {
  environmentId: string;
  tenantId: string;
  resources: TwinResource[];
  dependencies: DependencyEdge[];
  lastReconciledAt: number;
  driftCount: number;
}
