/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Engine Core / Discovery
 * File           : observation.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers Ltd
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

export enum ObservationStatus {
  OBSERVED = 'OBSERVED',
  NOT_PRESENT = 'NOT_PRESENT',
  NOT_ACCESSIBLE = 'NOT_ACCESSIBLE',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  TIMED_OUT = 'TIMED_OUT',
  FAILED = 'FAILED',
  STALE = 'STALE',
  UNKNOWN = 'UNKNOWN',
}

/**
 * @interface Fact
 * @description Corporate Governed interface implementation for Fact
 * @classification ENTERPRISE
 */
export interface Fact {
  id: string;
  key: string;
  value: any;
  confidenceScore: number;
  observedAt: Date;
  source: string;
  metadata?: Record<string, string>;
}

/**
 * @interface ObservationEvent
 * @description Corporate Governed interface implementation for ObservationEvent
 * @classification ENTERPRISE
 */
export interface ObservationEvent {
  eventId: string;
  timestamp: Date;
  targetId: string;
  status: ObservationStatus;
  facts: Fact[];
  errors?: string[];
  executionDurationMs: number;
}
