/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Shared / Environment Twin
 * File           : environment-twin.ts
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

export type KnowledgeState =
  | 'OBSERVED' | 'DECLARED' | 'INFERRED'
  | 'DESIRED' | 'PLANNED' | 'APPLIED' | 'VERIFIED';

export type ResourceLifecycleState =
  | 'DISCOVERED' | 'MODELLED' | 'PLANNED' | 'PROVISIONED'
  | 'DEPLOYED' | 'VERIFIED' | 'HEALTHY' | 'DEGRADED' | 'RECOVERING';

export interface TwinResource {
  resourceId: string;
  type: string;
  knowledgeState: KnowledgeState;
  lifecycleState: ResourceLifecycleState;
  metadata: Record<string, string>;
  lastObservedAt: number | null;
  lastVerifiedAt: number | null;
}

export interface DependencyEdge {
  fromResourceId: string;
  toResourceId: string;
  dependencyType: string;
  verified: boolean;
}

export interface EnvironmentTwin {
  environmentId: string;
  tenantId: string;
  resources: TwinResource[];
  dependencies: DependencyEdge[];
  lastReconciledAt: number;
  driftCount: number;
}
