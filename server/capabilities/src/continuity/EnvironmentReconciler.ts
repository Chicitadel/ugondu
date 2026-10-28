/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Execution Continuity & Policy Governance
 * File           : EnvironmentReconciler.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-21
 * Last Modified  : 2026-10-21
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53 / UAIGOS 3.0.0
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import * as crypto from 'crypto';

export interface TargetResource {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  digest?: string;
}

export interface EnvironmentProbeResult {
  probedAt: string;
  verified: boolean;
  evidenceDigest?: string;
  resources: TargetResource[];
}

export interface ReconciliationDelta {
  resourceId: string;
  resourceType: string;
  action: 'NOOP' | 'CREATE' | 'UPDATE' | 'REPAIR' | 'DESTRUCTIVE_DELETE';
  desiredProperties?: Record<string, unknown>;
  observedProperties?: Record<string, unknown>;
  requiresApproval: boolean;
  reason: string;
}

export interface ReconciliationReport {
  status: 'IN_SYNC' | 'DELTA_DETECTED' | 'DRIFT_DETECTED' | 'INDETERMINATE_UNPROBED';
  desiredCount: number;
  observedCount: number;
  deltas: ReconciliationDelta[];
  requiresDestructiveApproval: boolean;
  reconciliationDigest: string;
}

export function computePropertiesDigest(props: Record<string, unknown>): string {
  const keys = Object.keys(props).sort();
  const sorted: Record<string, unknown> = {};
  for (const k of keys) sorted[k] = props[k];
  return crypto.createHash('sha256').update(JSON.stringify(sorted), 'utf8').digest('hex');
}

export class EnvironmentReconciler {
  /**
   * Reconciles desired deployment resources against empirical target probe results.
   * If probe is not verified, fails closed as INDETERMINATE_UNPROBED.
   */
  public reconcile(
    desiredResources: TargetResource[],
    observedProbe: EnvironmentProbeResult
  ): ReconciliationReport {
    if (!observedProbe.verified || !observedProbe.evidenceDigest) {
      return {
        status: 'INDETERMINATE_UNPROBED',
        desiredCount: desiredResources.length,
        observedCount: 0,
        deltas: [],
        requiresDestructiveApproval: false,
        reconciliationDigest: 'UNPROBED_FAIL_CLOSED',
      };
    }

    const observedMap = new Map<string, TargetResource>();
    for (const res of observedProbe.resources) {
      observedMap.set(res.id, res);
    }

    const deltas: ReconciliationDelta[] = [];
    let requiresDestructiveApproval = false;

    // 1. Evaluate desired resources
    for (const desired of desiredResources) {
      const observed = observedMap.get(desired.id);

      if (!observed) {
        deltas.push({
          resourceId: desired.id,
          resourceType: desired.type,
          action: 'CREATE',
          desiredProperties: desired.properties,
          requiresApproval: false,
          reason: `Resource '${desired.id}' is absent in target environment; creation required.`,
        });
        continue;
      }

      // Both exist: compare digests
      const desiredDigest = desired.digest ?? computePropertiesDigest(desired.properties);
      const observedDigest = observed.digest ?? computePropertiesDigest(observed.properties);

      if (desiredDigest === observedDigest) {
        deltas.push({
          resourceId: desired.id,
          resourceType: desired.type,
          action: 'NOOP',
          desiredProperties: desired.properties,
          observedProperties: observed.properties,
          requiresApproval: false,
          reason: `Resource '${desired.id}' is already converged with desired state.`,
        });
      } else {
        deltas.push({
          resourceId: desired.id,
          resourceType: desired.type,
          action: 'UPDATE',
          desiredProperties: desired.properties,
          observedProperties: observed.properties,
          requiresApproval: false,
          reason: `Resource '${desired.id}' configuration drift detected; modification required.`,
        });
      }
    }

    // 2. Detect orphaned resources in target environment (not in desired specification)
    const desiredIds = new Set(desiredResources.map((r) => r.id));
    for (const observed of observedProbe.resources) {
      if (!desiredIds.has(observed.id)) {
        requiresDestructiveApproval = true;
        deltas.push({
          resourceId: observed.id,
          resourceType: observed.type,
          action: 'DESTRUCTIVE_DELETE',
          observedProperties: observed.properties,
          requiresApproval: true,
          reason: `Resource '${observed.id}' is unmanaged in desired specification; destructive removal requires explicit approval.`,
        });
      }
    }

    const nonNoop = deltas.filter((d) => d.action !== 'NOOP');
    const hasDrift = deltas.some((d) => d.action === 'UPDATE' || d.action === 'DESTRUCTIVE_DELETE');

    const status: ReconciliationReport['status'] =
      nonNoop.length === 0 ? 'IN_SYNC' : hasDrift ? 'DRIFT_DETECTED' : 'DELTA_DETECTED';

    const rawDeltas = JSON.stringify(deltas.map((d) => `${d.resourceId}:${d.action}`));
    const reconciliationDigest = crypto.createHash('sha256').update(rawDeltas, 'utf8').digest('hex');

    return {
      status,
      desiredCount: desiredResources.length,
      observedCount: observedProbe.resources.length,
      deltas,
      requiresDestructiveApproval,
      reconciliationDigest,
    };
  }
}
