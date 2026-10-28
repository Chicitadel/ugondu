/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Shared / Discovery
 * File           : discovery.ts
 * Version        : 1.0.0
 * Author         : Platform Architecture Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS 5.0, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

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

export interface HostingPanelDiscovery {
  panel: 'cpanel' | 'plesk' | 'directadmin' | 'unknown';
  domains: string[];
  applications: string[];
  databases: string[];
  sslCertificates: Array<{ domain: string; expiresAt: number }>;
  dnsZones: string[];
  cronJobs: string[];
  diskUsageMb: number;
}
