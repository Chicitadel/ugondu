/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Engine Core / Twin
 * File           : schema.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
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

import {
  ApplicationDiscovery,
  HostDiscovery,
  CloudDiscovery,
  KubernetesDiscovery,
  HostingPanelDiscovery
} from '../../../../shared/discovery';

import {
  KnowledgeState,
  ResourceLifecycleState,
  TwinResource,
  DependencyEdge,
  EnvironmentTwin as BaseEnvironmentTwin
} from '../../../../shared/environment-twin';

export interface ProviderInfo {
  providerId: string;
  name: string;
  type: string;
  regions: string[];
}

export interface ComputeInfo {
  hosts?: HostDiscovery[];
  kubernetes?: KubernetesDiscovery[];
  panels?: HostingPanelDiscovery[];
}

export interface DatabaseInfo {
  id: string;
  engine: string;
  version: string;
  cluster: boolean;
  endpoints: string[];
}

export interface TLSInfo {
  certificates: Array<{
    domain: string;
    issuer: string;
    expiresAt: number;
    valid: boolean;
  }>;
}

export interface SecretReference {
  id: string;
  name: string;
  store: string;
  lastRotated: number;
}

export interface BackupInfo {
  backupId: string;
  status: 'ACTIVE' | 'FAILED' | 'UNKNOWN';
  lastBackupAt: number;
  retentionDays: number;
}

export interface RecoveryCapabilities {
  rtoMinutes: number;
  rpoMinutes: number;
  testedAt?: number;
}

export interface ObservabilityInfo {
  metrics: boolean;
  tracing: boolean;
  logs: boolean;
  tools: string[];
}

export interface OwnershipInfo {
  teamId: string;
  ownerEmail: string;
  escalationPolicyId?: string;
}

export interface PolicyInfo {
  policyId: string;
  name: string;
  compliant: boolean;
}

export interface CostInfo {
  currency: string;
  monthlyEstimate: number;
  lastUpdated: number;
}

export interface HealthInfo {
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
  lastChecked: number;
  checkId: string;
}

export interface IncidentInfo {
  incidentId: string;
  severity: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: number;
}

export interface DeploymentInfo {
  deploymentId: string;
  version: string;
  deployedAt: number;
  status: string;
}

export interface DriftInfo {
  driftId: string;
  detectedAt: number;
  severity: string;
  details: string;
}

export interface EvidenceInfo {
  evidenceId: string;
  type: string;
  collectedAt: number;
  locationUrl: string;
}

export interface ExtendedEnvironmentTwin extends BaseEnvironmentTwin {
  identity: {
    environmentName: string;
    description?: string;
    labels: Record<string, string>;
  };
  provider: ProviderInfo;
  compute: ComputeInfo;
  cloud?: CloudDiscovery;
  applications?: ApplicationDiscovery[];
  databases: DatabaseInfo[];
  tls: TLSInfo;
  secretsReferences: SecretReference[];
  backups: BackupInfo[];
  recoveryCapabilities: RecoveryCapabilities;
  observability: ObservabilityInfo;
  ownership: OwnershipInfo;
  policies: PolicyInfo[];
  costs: CostInfo;
  health: HealthInfo;
  incidents: IncidentInfo[];
  deployments: DeploymentInfo[];
  drift: DriftInfo[];
  evidence: EvidenceInfo[];
}
