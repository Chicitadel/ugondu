/******************************************************************************
 * Project        : Ugondu
 * Module         : Intent Engine
 * File           : requirements.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
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

export interface ApplicationRequirements {
  runtime: string | null;       // 'nodejs' | 'php' | 'python' | 'go' | null
  framework: string | null;     // 'express' | 'laravel' | 'django' | null
  port: number | null;
  database: string | null;      // 'postgresql' | 'mysql' | 'mongodb' | null
  buildRequired: boolean;
}

export interface OperationalRequirements {
  backup: boolean;
  rollback: boolean;
  monitoring: boolean;
  autoRecovery: boolean;
  scaling: boolean;
}

export interface SecurityRequirements {
  tlsRequired: boolean;
  privateDatabaseNetwork: boolean;
  secretsManagement: boolean;
  leastPrivilege: boolean;
}

export interface AvailabilityRequirements {
  healthCheck: boolean;
  restartPolicy: 'always' | 'on-failure' | 'never';
  redundancy: 'none' | 'single-zone' | 'multi-zone';
  uptimeTarget: string | null;
}

export interface DecomposedIntent {
  raw: string;
  application: ApplicationRequirements;
  operational: OperationalRequirements;
  security: SecurityRequirements;
  availability: AvailabilityRequirements;
}
