/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Intent Engine
 * File           : mapper.ts
 * Version        : 1.0.0
 * Author         : Engineering Lead
 * Organization   : Air Roofers
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

import { NormalizedIntent } from "../model/normalized-intent";
import type { AuthorizationRequirement, RequiredAuthoritySet } from '../model/authorization-requirements';

/**
 * @interface CapabilityNode
 * @description Corporate Governed interface implementation for CapabilityNode
 * @classification ENTERPRISE
 */
export interface CapabilityNode {
    id: string;
    name: string;
    dependencies: string[];
}

/**
 * @class CapabilityMapper
 * @description Corporate Governed class implementation for CapabilityMapper
 * @classification ENTERPRISE
 */
export class CapabilityMapper {
    public mapToGraph(intent: NormalizedIntent): CapabilityNode[] {
        const graph: CapabilityNode[] = [];
        
        for (const req of intent.normalizedRequirements) {
            graph.push({
                id: `cap-${req.id}`,
                name: req.description,
                dependencies: []
            });
        }
        
        return graph;
    }
}

/**
 * Map authorization requirements from a NormalizedIntent to a RequiredAuthoritySet.
 * Called by the Architecture Engine when compiling candidate architectures.
 *
 * For each candidate, this produces the authority set that UPPIE will use to:
 * 1. Check existing authority
 * 2. Calculate the gap
 * 3. Compile minimum grants via LeastPrivilegeCompiler
 */
export function mapAuthorizationRequirements(
  requirements: AuthorizationRequirement[],
  candidateId:  string
): RequiredAuthoritySet {
  const permanentGrants = requirements.filter(
    (r) => r.grantScope === 'PERMANENT'
  );
  const temporaryGrants = requirements.filter(
    (r) => r.grantScope === 'TEMPORARY' || r.grantScope === 'SESSION'
  );

  const totalGrantCount = requirements.reduce(
    (sum, r) => sum + r.requiredCapabilities.length, 0
  );

  const approvalNeeded = requirements.some(
    (r) => r.approvalScopeHint === 'ADMIN_APPROVAL' || r.approvalScopeHint === 'TEAM_APPROVAL'
  );

  let complexity: RequiredAuthoritySet['authorityComplexity'];
  if (totalGrantCount <= 3 && permanentGrants.length === 0) {
    complexity = 'SIMPLE';
  } else if (totalGrantCount <= 10) {
    complexity = 'MODERATE';
  } else {
    complexity = 'COMPLEX';
  }

  void temporaryGrants; // used for future complexity refinement

  return {
    candidateId,
    requirements,
    estimatedGrantCount:     totalGrantCount,
    estimatedApprovalNeeded: approvalNeeded,
    authorityComplexity:     complexity,
  };
}
