/******************************************************************************
 * Project        : Ugondu
 * Module         : doctor::model
 * File           : evidence_graph.rs
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

// Implementation for evidence_graph.rs
import { EvidenceItem } from '../evidence/collector';

/**
 * @interface EvidenceEdge
 * @description Corporate Governed interface implementation for EvidenceEdge
 * @classification ENTERPRISE
 */
export interface EvidenceEdge {
  from: string; // evidence item id
  to: string;   // evidence item id
  relationship: 'CAUSED_BY' | 'CORRELATED_WITH' | 'PRECEDED_BY';
}

/**
 * @interface EvidenceGraph
 * @description Corporate Governed interface implementation for EvidenceGraph
 * @classification ENTERPRISE
 */
export interface EvidenceGraph {
  nodes: EvidenceItem[];
  edges: EvidenceEdge[];
}
