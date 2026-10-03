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
  HostingPanelDiscovery,
  KnowledgeState,
  ResourceLifecycleState,
  TwinResource,
  DependencyEdge,
  EnvironmentTwin as BaseEnvironmentTwin
} from './shared-types';

/**
 * @interface ProviderInfo
 * @description Corporate Governed interface implementation for ProviderInfo
 * @classification ENTERPRISE
 */
export interface ProviderInfo {
  providerId: string;
  name: string;
  type: string;
  regions: string[];
}

/**
 * @interface ComputeInfo
 * @description Corporate Governed interface implementation for ComputeInfo
 * @classification ENTERPRISE
 */
export interface ComputeInfo {
  hosts?: HostDiscovery[];
  kubernetes?: KubernetesDiscovery[];
  panels?: HostingPanelDiscovery[];
}

/**
 * @interface DatabaseInfo
 * @description Corporate Governed interface implementation for DatabaseInfo
 * @classification ENTERPRISE
 */
export interface DatabaseInfo {
  id: string;
  engine: string;
  version: string;
  cluster: boolean;
  endpoints: string[];
}

/**
 * @interface TLSInfo
 * @description Corporate Governed interface implementation for TLSInfo
 * @classification ENTERPRISE
 */
export interface TLSInfo {
  certificates: Array<{
    domain: string;
    issuer: string;
    expiresAt: number;
    valid: boolean;
  }>;
}

/**
 * @interface SecretReference
 * @description Corporate Governed interface implementation for SecretReference
 * @classification ENTERPRISE
 */
export interface SecretReference {
  id: string;
  name: string;
  store: string;
  lastRotated: number;
}

/**
 * @interface BackupInfo
 * @description Corporate Governed interface implementation for BackupInfo
 * @classification ENTERPRISE
 */
export interface BackupInfo {
  backupId: string;
  status: 'ACTIVE' | 'FAILED' | 'UNKNOWN';
  lastBackupAt: number;
  retentionDays: number;
}

/**
 * @interface RecoveryCapabilities
 * @description Corporate Governed interface implementation for RecoveryCapabilities
 * @classification ENTERPRISE
 */
export interface RecoveryCapabilities {
  rtoMinutes: number;
  rpoMinutes: number;
  testedAt?: number;
}

/**
 * @interface ObservabilityInfo
 * @description Corporate Governed interface implementation for ObservabilityInfo
 * @classification ENTERPRISE
 */
export interface ObservabilityInfo {
  metrics: boolean;
  tracing: boolean;
  logs: boolean;
  tools: string[];
}

/**
 * @interface OwnershipInfo
 * @description Corporate Governed interface implementation for OwnershipInfo
 * @classification ENTERPRISE
 */
export interface OwnershipInfo {
  teamId: string;
  ownerEmail: string;
  escalationPolicyId?: string;
}

/**
 * @interface PolicyInfo
 * @description Corporate Governed interface implementation for PolicyInfo
 * @classification ENTERPRISE
 */
export interface PolicyInfo {
  policyId: string;
  name: string;
  compliant: boolean;
}

/**
 * @interface CostInfo
 * @description Corporate Governed interface implementation for CostInfo
 * @classification ENTERPRISE
 */
export interface CostInfo {
  currency: string;
  monthlyEstimate: number;
  lastUpdated: number;
}

/**
 * @interface HealthInfo
 * @description Corporate Governed interface implementation for HealthInfo
 * @classification ENTERPRISE
 */
export interface HealthInfo {
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
  lastChecked: number;
  checkId: string;
}

/**
 * @interface IncidentInfo
 * @description Corporate Governed interface implementation for IncidentInfo
 * @classification ENTERPRISE
 */
export interface IncidentInfo {
  incidentId: string;
  severity: string;
  status: 'OPEN' | 'RESOLVED';
  createdAt: number;
}

/**
 * @interface DeploymentInfo
 * @description Corporate Governed interface implementation for DeploymentInfo
 * @classification ENTERPRISE
 */
export interface DeploymentInfo {
  deploymentId: string;
  version: string;
  deployedAt: number;
  status: string;
}

/**
 * @interface DriftInfo
 * @description Corporate Governed interface implementation for DriftInfo
 * @classification ENTERPRISE
 */
export interface DriftInfo {
  driftId: string;
  detectedAt: number;
  severity: string;
  details: string;
}

/**
 * @interface EvidenceInfo
 * @description Corporate Governed interface implementation for EvidenceInfo
 * @classification ENTERPRISE
 */
export interface EvidenceInfo {
  evidenceId: string;
  type: string;
  collectedAt: number;
  locationUrl: string;
}

/**
 * @interface ExtendedEnvironmentTwin
 * @description Corporate Governed interface implementation for ExtendedEnvironmentTwin
 * @classification ENTERPRISE
 */
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
