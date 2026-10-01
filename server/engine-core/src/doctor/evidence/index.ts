/******************************************************************************
 * Project        : Ugondu
 * Module         : doctor::evidence
 * File           : index.rs
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Human Governed
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

// Implementation for index.rs
export { EvidenceCollector, EvidenceItem } from './collector';
export { FreshnessValidator, FreshnessPolicy } from './freshness';
export { EvidenceIntegrityChecker } from './integrity';
export { EvidenceNormalizer } from './normalizer';
