/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Fabric Capabilities Engine
 * File           : database.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-03
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
export type ResolvedValues = Record<string, string | number | boolean>;
export type ProviderOptions = Readonly<Record<string, unknown>> & { readonly mode?: string };

export type DatabaseEngine = 'postgres' | 'mysql' | 'document';

export const DATABASE_ENGINES: ReadonlyArray<DatabaseEngine> = ['postgres', 'mysql', 'document'];

export interface DatabaseCapability {
  provisionDatabase(config: DatabaseConfig, options: ProviderOptions): Promise<DatabaseResult>;
  deprovisionDatabase(id: string): Promise<void>;
  createSnapshot(req: { resourceType: string, resourceId: string }): Promise<string>;
}

/**
 * @interface DatabaseConfig
 * @description Credentials are never part of the configuration; the provider obtains them through a secret reference.
 * @classification ENTERPRISE
 */
export interface DatabaseConfig { name: string; engine: DatabaseEngine; capacity: number; credentialsRef?: string; }

/**
 * @interface DatabaseResult
 * @description Corporate Governed interface implementation for DatabaseResult
 * @classification ENTERPRISE
 */
export interface DatabaseResult { id: string; connectionString: string; resolved?: ResolvedValues; }
