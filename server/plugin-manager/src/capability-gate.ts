/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Plugin Manager — Capability Gate
 * File           : capability-gate.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-02
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

// @ts-ignore
import { __t } from '../../shared/i18n';

/**
 * Plugin capability decision — the result of evaluating whether a plugin
 * may be activated for a specific tenant and capability manifest.
 */
export type PluginCapabilityDecision =
  | 'ACTIVATE'
  | 'BLOCK_NOT_ENTITLED'
  | 'BLOCK_DEPENDENCY'
  | 'BLOCK_EDITION'
  | 'SUSPEND';

/**
 * @interface PluginCapabilityMetadata
 * @description Corporate Governed interface implementation for PluginCapabilityMetadata
 * @classification ENTERPRISE
 */
export interface PluginCapabilityMetadata {
  pluginId:             string;
  publisher:            string;
  version:              string;
  requiredCapabilities: string[];   // capabilities this plugin requires
  minimumEdition:       string;     // e.g. 'SOVEREIGN'
  maximumEdition?:      string;     // optional upper bound
  dependencies:         string[];   // other plugin IDs this plugin requires
  securityClass:        'CORE' | 'EXTENDED' | 'MARKETPLACE';
  executionScope:       'TENANT' | 'WORKSPACE' | 'FLEET';
}

/**
 * @interface PluginCapabilityDecisionResult
 * @description Corporate Governed interface implementation for PluginCapabilityDecisionResult
 * @classification ENTERPRISE
 */
export interface PluginCapabilityDecisionResult {
  decision:    PluginCapabilityDecision;
  pluginId:    string;
  tenantId:    string;
  reason:      string;
  evaluatedAt: string;   // ISO-8601
}

/**
 * Evaluate whether a plugin may be activated for a tenant.
 *
 * Checks:
 * 1. Edition meets minimum requirement
 * 2. All required capabilities are entitled
 * 3. All plugin dependencies are available
 *
 * INVARIANT: A plugin requiring SOVEREIGN capability MUST be BLOCK_NOT_ENTITLED
 *            for a FREE or PROFESSIONAL tenant.
 */
export function evaluatePluginCapability(
  plugin:               PluginCapabilityMetadata,
  tenantId:             string,
  tenantEdition:        string,
  entitledCapabilities: Set<string>,
  availablePlugins:     Set<string>
): PluginCapabilityDecisionResult {
  const evaluatedAt = new Date().toISOString();

  const EDITION_RANK: Record<string, number> = {
    FREE: 1, PROFESSIONAL: 2, BUSINESS: 3, SOVEREIGN: 4,
  };
  const tenantRank   = EDITION_RANK[tenantEdition] ?? 0;
  const requiredRank = EDITION_RANK[plugin.minimumEdition] ?? 0;

  if (tenantRank < requiredRank) {
    return {
      decision: 'BLOCK_EDITION',
      pluginId: plugin.pluginId,
      tenantId,
      reason: __t('ui.responses.plugin_requires_edition_tenant_has', { 'plugin_pluginId': plugin.pluginId, 'plugin_minimumEdition': plugin.minimumEdition, 'tenantEdition': tenantEdition }),
      evaluatedAt,
    };
  }

  const missingCaps = plugin.requiredCapabilities.filter(
    (c) => !entitledCapabilities.has(c)
  );
  if (missingCaps.length > 0) {
    return {
      decision: 'BLOCK_NOT_ENTITLED',
      pluginId: plugin.pluginId,
      tenantId,
      reason: __t('ui.responses.plugin_requires_capabilities_not_entitled', { 'plugin_pluginId': plugin.pluginId, 'missingCaps_join______': missingCaps.join(', ') }),
      evaluatedAt,
    };
  }

  const missingDeps = plugin.dependencies.filter(
    (d) => !availablePlugins.has(d)
  );
  if (missingDeps.length > 0) {
    return {
      decision: 'BLOCK_DEPENDENCY',
      pluginId: plugin.pluginId,
      tenantId,
      reason: __t('ui.responses.plugin_depends_on_missing_plugins', { 'plugin_pluginId': plugin.pluginId, 'missingDeps_join______': missingDeps.join(', ') }),
      evaluatedAt,
    };
  }

  return {
    decision:    'ACTIVATE',
    pluginId:    plugin.pluginId,
    tenantId,
    reason: __t('all_capability_and_edition_req'),
    evaluatedAt,
  };
}
