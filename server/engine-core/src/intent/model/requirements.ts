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

/**
 * RequirementCategory — classifies decomposed intent requirements by domain.
 * AUTHORIZATION requirements are passed to UPPIE for authority gap analysis.
 */
export enum RequirementCategory {
  APPLICATION    = 'APPLICATION',
  OPERATIONAL    = 'OPERATIONAL',
  SECURITY       = 'SECURITY',
  AVAILABILITY   = 'AVAILABILITY',
  AUTHORIZATION  = 'AUTHORIZATION',
}

/**
 * @interface ApplicationRequirements
 * @description Corporate Governed interface implementation for ApplicationRequirements
 * @classification ENTERPRISE
 */
export interface ApplicationRequirements {
  runtime: string | null;       // 'nodejs' | 'php' | 'python' | 'go' | null
  framework: string | null;     // 'express' | 'laravel' | 'django' | null
  port: number | null;
  database: string | null;      // 'postgresql' | 'mysql' | 'mongodb' | null
  buildRequired: boolean;
}

/**
 * @interface OperationalRequirements
 * @description Corporate Governed interface implementation for OperationalRequirements
 * @classification ENTERPRISE
 */
export interface OperationalRequirements {
  backup: boolean;
  rollback: boolean;
  monitoring: boolean;
  autoRecovery: boolean;
  scaling: boolean;
}

/**
 * @interface SecurityRequirements
 * @description Corporate Governed interface implementation for SecurityRequirements
 * @classification ENTERPRISE
 */
export interface SecurityRequirements {
  tlsRequired: boolean;
  privateDatabaseNetwork: boolean;
  secretsManagement: boolean;
  leastPrivilege: boolean;
}

/**
 * @interface AvailabilityRequirements
 * @description Corporate Governed interface implementation for AvailabilityRequirements
 * @classification ENTERPRISE
 */
export interface AvailabilityRequirements {
  healthCheck: boolean;
  restartPolicy: 'always' | 'on-failure' | 'never';
  redundancy: 'none' | 'single-zone' | 'multi-zone';
  uptimeTarget: string | null;
}

/**
 * @interface DecomposedIntent
 * @description Corporate Governed interface implementation for DecomposedIntent
 * @classification ENTERPRISE
 */
export interface DecomposedIntent {
  raw: string;
  application: ApplicationRequirements;
  operational: OperationalRequirements;
  security: SecurityRequirements;
  availability: AvailabilityRequirements;
}
