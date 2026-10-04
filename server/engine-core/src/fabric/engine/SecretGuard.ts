/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Provider Fabric — Provisioning Engine
 * File           : SecretGuard.ts
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

export const SECRET_PREFIX = 'secret:';

/** Field names that carry credentials. Matching is deliberately broad: a false positive is a one-word fix, a leak is not. */
const SECRET_FIELD = /password|passwd|secret|token|apikey|api_key|privatekey|private_key|credential/i;

/**
 * A plan, its journal and its evidence carry credential references only. A field that looks like a credential must
 * hold `secret:<name>`; anything else is refused before it can reach a provider, a journal or a state record.
 */
export function assertNoSecretValues(nodeId: string, values: Record<string, unknown>): void {
  for (const [field, value] of Object.entries(values)) {
    if (!SECRET_FIELD.test(field)) continue;
    const isReference = typeof value === 'string' && value.startsWith(SECRET_PREFIX) && value.slice(SECRET_PREFIX.length).trim() !== '';
    if (!isReference) throw new Error(__t('fabric.engine.secret_in_plan', { node: nodeId, field }));
  }
}
