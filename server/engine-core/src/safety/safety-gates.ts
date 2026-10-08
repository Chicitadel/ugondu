/******************************************************************************
 * Project        : Universal Autonomous AI Governance Operating System
 * Module         : Safety Gates Validator
 * File           : safety-gates.ts
 * Version        : 1.0.0
 * Author         : AI Governed
 * Organization   : UAIGOS
 * Created Date   : 2026-10-08
 * Last Modified  : 2026-10-08
 * Classification : ENTERPRISE
 *
 * Governance:
 * - AI Governed
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
 * Copyright (c) 2026 UAIGOS
 * All Rights Reserved.
 ******************************************************************************/

// We import the Universal Resource schemas from shared components as requested.
// @ts-ignore
import { ResourceClassification, ResourceOwnership } from '../../../shared/schemas/resource-classification.schema';
// @ts-ignore
import { ResourceProtocol } from '../../../shared/protocols/resource.protocol';
import * as crypto from 'crypto';

import * as fs from 'fs';
import * as path from 'path';

export enum ActionClassification {
  REVERSIBLE = 'REVERSIBLE',
  RECOVERABLE = 'RECOVERABLE',
  DESTRUCTIVE = 'DESTRUCTIVE',
  IRREVERSIBLE = 'IRREVERSIBLE'
}

export interface CanonicalActionEnvelope {
  principalArn: string;
  accountId: string;
  region: string;
  resourceId: string;
  action: string;
  classification: string;
  transactionId: string;
  intentHash: string;
  policyVersion: string;
  expiration: number;
}

export interface SafetyProof {
  authenticatedUserId: string;
  mfaVerified: boolean;
  intentHash: string;
  approvalSignatures: string[];
  canonicalEnvelope?: CanonicalActionEnvelope;
}

export interface ActionContext {
  actionId: string;
  resourceId: string;
  classification: ActionClassification;
  blastRadius: number; // Limits the number of downstream systems affected
  dependencyGraph: string[]; // Identifiers of dependent resources
  isAutonomous: boolean;
  proof: SafetyProof | null;
}

export class SafetyGatesValidator {
  
  private readonly stateDir: string;

  constructor() {
    this.stateDir = path.join(process.cwd(), '.governance', 'state', 'leases');
    if (!fs.existsSync(this.stateDir)) {
      fs.mkdirSync(this.stateDir, { recursive: true });
    }
  }

  /**
   * Evaluates the dependency graph to compute blast radius.
   * Ensures that we do not exceed safe topological boundaries.
   */
  public evaluateDependencyGraph(dependencies: string[]): number {
    return dependencies.length;
  }

  /**
   * Attempts to acquire an exclusive safety lease for a high-risk operation.
   * Uses file-system exclusive file creation (wx flag) to simulate atomic compare-and-swap.
   */
  public async acquireSafetyLease(actionId: string, resourceId: string): Promise<boolean> {
    const safeResourceId = resourceId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const lockFile = path.join(this.stateDir, `${safeResourceId}.lock`);
    const now = Date.now();

    try {
      // Clean up stale locks safely
      if (fs.existsSync(lockFile)) {
        const stats = fs.statSync(lockFile);
        if (now - stats.mtimeMs > 30000) {
          fs.unlinkSync(lockFile);
        } else {
          return false; // Lock held and fresh
        }
      }
      
      // Atomic write using wx (exclusive flag)
      fs.writeFileSync(lockFile, JSON.stringify({ actionId, expiresAt: now + 30000 }), { flag: 'wx' });
      return true;
    } catch (err: any) {
      if (err.code === 'EEXIST') {
        return false; // Lock acquired by another process concurrently
      }
      throw err;
    }
  }

  private verifyApprovalSignature(canonicalEnvelope: CanonicalActionEnvelope, signaturePayload: string): boolean {
    try {
      // Expecting signaturePayload to be JSON: { publicKey: string, signature: string }
      const { publicKey, signature } = JSON.parse(signaturePayload);
      if (!publicKey || !signature) return false;
      
      const payloadString = JSON.stringify(canonicalEnvelope);
      const verify = crypto.createVerify('sha256');
      verify.update(payloadString);
      verify.end();
      return verify.verify(publicKey, signature, 'base64');
    } catch (e) {
      return false;
    }
  }

  /**
   * Validates if a proposed action can safely proceed through the safety gates.
   */
  public async validateAction(context: ActionContext): Promise<boolean> {
    // 1. Dependency Graph Evaluation & Blast Radius Validation
    const computedRadius = this.evaluateDependencyGraph(context.dependencyGraph);
    if (computedRadius > context.blastRadius) {
      throw new Error(`Blast radius limit exceeded. Expected <= ${context.blastRadius}, got ${computedRadius}`);
    }

    // Verify external cryptographic signatures using canonical envelope
    if (context.proof?.approvalSignatures && context.proof.canonicalEnvelope) {
       for (const sigPayload of context.proof.approvalSignatures) {
         if (!this.verifyApprovalSignature(context.proof.canonicalEnvelope, sigPayload)) {
           throw new Error('Security Violation: Invalid or self-generated cryptographic signature against canonical envelope.');
         }
       }
    } else if (context.proof?.approvalSignatures) {
       throw new Error('Security Violation: Approval signatures present but no canonical envelope provided.');
    }

    // 2. Autonomous Deletion Governance
    if (context.isAutonomous) {
      if (
        context.classification === ActionClassification.DESTRUCTIVE || 
        context.classification === ActionClassification.IRREVERSIBLE
      ) {
        if (!context.proof || !context.proof.approvalSignatures || context.proof.approvalSignatures.length === 0) {
          throw new Error('Governance Violation: Autonomous deletion NEVER permitted for unproven resources without explicit human approval signatures.');
        }
      }
    }

    // 3. Proof Evaluation by Classification
    switch (context.classification) {
      case ActionClassification.REVERSIBLE:
        // Reversible actions have the lowest friction
        break;

      case ActionClassification.RECOVERABLE:
        if (!context.proof?.authenticatedUserId || context.proof.authenticatedUserId === 'system') {
          throw new Error('Recoverable actions require authenticated canonical user proof, cannot be "system".');
        }
        break;

      case ActionClassification.DESTRUCTIVE:
        if (!context.proof?.mfaVerified) {
          throw new Error('Destructive actions require MFA verification.');
        }
        break;

      case ActionClassification.IRREVERSIBLE:
        if (!context.proof?.mfaVerified || context.proof.approvalSignatures.length < 2) {
          throw new Error('Irreversible actions require MFA verification and multiple multi-party approval signatures.');
        }
        break;
      
      default:
        throw new Error('Unknown or unclassified action.');
    }

    // 4. Lease Acquisition for DESTRUCTIVE / IRREVERSIBLE
    if (
      context.classification === ActionClassification.DESTRUCTIVE || 
      context.classification === ActionClassification.IRREVERSIBLE
    ) {
      const leaseAcquired = await this.acquireSafetyLease(context.actionId, context.resourceId);
      if (!leaseAcquired) {
        throw new Error('Security Violation: Failed to acquire exclusive safety lease for high-risk operation.');
      }
    }

    return true;
  }
}

