/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : CEG — Capability Manifest
 * File           : CapabilityManifest.ts
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

import { z } from 'zod';
import type { UgonduEdition } from '../edition-registry/EditionDefinition';
import type { CapabilityState } from '../capability-registry/CapabilityDefinition';

/**
 * CapabilityManifest — server-signed entitlement document from Mandatag.
 *
 * INVARIANTS:
 * 1. This manifest is ALWAYS validated cryptographically before being trusted.
 * 2. The client CANNOT self-issue or modify this manifest.
 * 3. No client parameter, local configuration, or cached value may override
 *    an authoritative manifest from the server.
 */
export interface CapabilityManifest {
  tenantId:            string;
  subjectId:           string;
  edition:             UgonduEdition;
  entitlementVersion:  number;        // monotonically increasing
  capabilities:        string[];      // capability IDs the tenant is entitled to
  featureStates:       Record<string, CapabilityState>;
  limits:              Record<string, number | null>;
  issuedAt:            string;        // ISO-8601
  expiresAt:           string;        // ISO-8601
  policyDigest:        string;        // SHA-256 of policy at time of issuance
  manifestDigest:      string;        // SHA-256 of canonical manifest body
  signature:           string;        // Ed25519 signed by Mandatag
  signingKeyId:        string;
}

export const CapabilityManifestSchema = z.object({
  tenantId:           z.string(),
  subjectId:          z.string(),
  edition:            z.enum(['FREE', 'PROFESSIONAL', 'BUSINESS', 'SOVEREIGN']),
  entitlementVersion: z.number().int().positive(),
  capabilities:       z.array(z.string()),
  featureStates:      z.record(z.string(), z.string()),
  limits:             z.record(z.string(), z.union([z.number(), z.null()])),
  issuedAt:           z.string().datetime(),
  expiresAt:          z.string().datetime(),
  policyDigest:       z.string().length(64),
  manifestDigest:     z.string().length(64),
  signature:          z.string().min(1),
  signingKeyId:       z.string().min(1),
});

/** Check if manifest has expired. */
export function isManifestExpired(manifest: CapabilityManifest): boolean {
  return new Date(manifest.expiresAt) <= new Date();
}

/** Check if tenant is entitled to a specific capability. */
export function isEntitled(
  manifest:     CapabilityManifest,
  capabilityId: string
): boolean {
  return manifest.capabilities.includes(capabilityId);
}
