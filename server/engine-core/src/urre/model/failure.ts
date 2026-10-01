/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Engine Core / URRE / Model
 * File           : failure.ts
 * Version        : 1.0.0
 * Author         : Platform Architecture Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS 5.0, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

export type FailureClass = 
  | 'CLASS_A_EXECUTION'
  | 'CLASS_B_NETWORK'
  | 'CLASS_C_STORAGE'
  | 'CLASS_D_DATA_INTEGRITY'
  | 'CLASS_E_CONCURRENCY'
  | 'CLASS_F_RECOVERY'
  | 'CLASS_G_PROVIDER';

export type FailureDomain = 
  | 'CONTROL_PLANE'
  | 'DATA_PLANE'
  | 'TARGET_PLANE'
  | 'UGONDU_PLANE';

export interface URREFailure {
  failureId: string;
  failureClass: FailureClass;
  domain: FailureDomain;
  description: string;
  detectedAt: number;
  fatal: boolean;
  rawError?: string;
}
