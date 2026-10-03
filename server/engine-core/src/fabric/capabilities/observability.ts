/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Fabric Capabilities Engine
 * File           : observability.ts
 * Version        : 1.0.0
 * Author         : Platform Engineering Team
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

export interface ObservabilityCapability {
  registerMetricSink(config: MetricConfig): Promise<string>;
  registerLogSink(config: LogConfig): Promise<string>;
}
/**
 * @interface MetricConfig
 * @description Corporate Governed interface implementation for MetricConfig
 * @classification ENTERPRISE
 */
export interface MetricConfig { targetPath: string; resolutionSeconds: number; }
/**
 * @interface LogConfig
 * @description Corporate Governed interface implementation for LogConfig
 * @classification ENTERPRISE
 */
export interface LogConfig { targetPath: string; retentionDays: number; }
