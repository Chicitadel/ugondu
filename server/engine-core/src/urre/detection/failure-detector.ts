/******************************************************************************
 * Project        : Ugondu
 * Module         : engine-core/urre
 * File           : failure-detector.ts
 * Version        : 1.0.0
 * Author         : Antigravity AI
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
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
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

import { FailureClass } from '../model/failure';
import { FAILURE_SIGNATURES } from '../model/failure-signature';

export interface FailureContext {
  errorMessage: string;
  signals: Record<string, boolean>;
  operation: string;
}

export class FailureDetector {
  public classify(context: FailureContext): FailureClass {
    const errorLower = context.errorMessage.toLowerCase();

    for (const signature of FAILURE_SIGNATURES) {
      // 1. Try to match message patterns against each signature
      for (const pattern of signature.messagePatterns) {
        if (errorLower.includes(pattern.toLowerCase())) {
          return signature.failureClass;
        }
      }

      // 2. Try to match context signals
      for (const signal of signature.contextSignals) {
        if (context.signals[signal] === true) {
          return signature.failureClass;
        }
      }
    }

    // 3. Return UNKNOWN_FAILURE if nothing matches
    return FailureClass.UNKNOWN_FAILURE;
  }
}
