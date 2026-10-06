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

import { FailureClass } from '../model/failure';
import { FAILURE_SIGNATURES } from '../model/failure-signature';

/**
 * @interface FailureContext
 * @description Corporate Governed interface implementation for FailureContext
 * @classification ENTERPRISE
 */
export interface FailureContext {
  errorMessage: string;
  signals: Record<string, boolean>;
  operation: string;
}

/**
 * @class FailureDetector
 * @description Corporate Governed class implementation for FailureDetector
 * @classification ENTERPRISE
 */
export class FailureDetector {
  public classify(context: FailureContext): FailureClass {
    const errorLower = context.errorMessage.toLowerCase();

    for (const signature of FAILURE_SIGNATURES) {
      // 1. Try explicit message patterns
      for (const pattern of signature.messagePatterns) {
        if (errorLower.includes(pattern.toLowerCase())) {
          return signature.failureClass;
        }
      }

      // 2. Try implicit class-name match (normalise underscores to spaces in both sides)
      const classNamePattern = signature.failureClass.toLowerCase().replace(/_/g, ' ');
      const errorNormalised = errorLower.replace(/_/g, ' ');
      if (errorNormalised.includes(classNamePattern)) {
        return signature.failureClass;
      }

      // 3. Try context signals
      for (const signal of signature.contextSignals) {
        if (context.signals[signal] === true) {
          return signature.failureClass;
        }
      }
    }

    // 4. Return UNKNOWN_FAILURE if nothing matches
    return FailureClass.UNKNOWN_FAILURE;
  }
}
