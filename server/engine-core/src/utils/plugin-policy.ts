/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Plugin Policy Utilities
 * File           : plugin-policy.ts
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

export function isPluginRequired(pluginItem: unknown, reqBody: Record<string, unknown>): boolean {
  const pluginName =
    typeof pluginItem === 'string'
      ? pluginItem
      : (pluginItem as Record<string, unknown> | null)?.['name'] ?? '';

  if (typeof pluginItem === 'object' && pluginItem !== null) {
    const p = pluginItem as Record<string, unknown>;
    if (p['required'] === true) return true;
    if (String(p['failurePolicy'] ?? '').toUpperCase() === 'REQUIRED') return true;
    if (String(p['policy'] ?? '').toUpperCase() === 'REQUIRED') return true;
  }

  if (Array.isArray(reqBody['requiredPlugins']) && (reqBody['requiredPlugins'] as string[]).includes(pluginName as string)) {
    return true;
  }

  const pluginPolicies = reqBody['pluginPolicies'] as Record<string, unknown> | undefined;
  if (pluginPolicies && String(pluginPolicies[pluginName as string] ?? '').toUpperCase() === 'REQUIRED') {
    return true;
  }

  if (Array.isArray(reqBody['plugins'])) {
    for (const p of reqBody['plugins'] as unknown[]) {
      if (typeof p === 'object' && p !== null) {
        const item = p as Record<string, unknown>;
        if (item['name'] === pluginName) {
          if (item['required'] === true) return true;
          if (String(item['failurePolicy'] ?? '').toUpperCase() === 'REQUIRED') return true;
          if (String(item['policy'] ?? '').toUpperCase() === 'REQUIRED') return true;
        }
      }
    }
  }

  return false;
}
