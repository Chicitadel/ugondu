/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Shared Types
 * File           : policy-provenance.ts
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
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

export type ProvenanceSource =
  | 'PROVIDER_DEFAULT'
  | 'ORGANIZATION_ADMINISTRATOR'
  | 'HUMAN'
  | 'TERRAFORM'
  | 'CLOUDFORMATION'
  | 'PULUMI'
  | 'KUBERNETES_MANIFEST'
  | 'HELM'
  | 'UGONDU'
  | 'IMPORTED'
  | 'UNKNOWN';

/**
 * @interface AuthorizationProvenance
 * @description Corporate Governed interface implementation for AuthorizationProvenance
 * @classification ENTERPRISE
 */
export interface AuthorizationProvenance {
  source:               ProvenanceSource;
  sourceVersion?:       string;
  createdBy:            string;
  createdAt:            string;          // ISO-8601
  lastModifiedBy:       string;
  lastModifiedAt:       string;          // ISO-8601
  changeReason?:        string;
  linkedOperationId?:   string;          // Ugondu operation ID if Ugondu created it
}

export function isIaCManaged(provenance: AuthorizationProvenance): boolean {
  return (
    provenance.source === 'TERRAFORM' ||
    provenance.source === 'CLOUDFORMATION' ||
    provenance.source === 'PULUMI' ||
    provenance.source === 'KUBERNETES_MANIFEST' ||
    provenance.source === 'HELM'
  );
}
