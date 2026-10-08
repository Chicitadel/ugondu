/******************************************************************************
 * Project        : Universal Autonomous AI Governance Operating System (UAIGOS)
 * Module         : Engine Core - Database Lifecycle
 * File           : provider.ts
 * Version        : 1.0.0
 * Author         : Enterprise Architecture Team
 * Organization   : UAIGOS Governance Board
 * Created Date   : 2026-10-08
 * Last Modified  : 2026-10-08
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
 * Copyright (c) 2026 UAIGOS Governance Board
 * All Rights Reserved.
 ******************************************************************************/

export interface DatabaseProvider {
    /**
     * Initializes the connection to the database.
     */
    connect(): Promise<void>;

    /**
     * Gracefully disconnects from the database.
     */
    disconnect(): Promise<void>;

    /**
     * Executes a given query against the provider.
     */
    execute<T>(query: string, params?: unknown[]): Promise<T>;

    /**
     * Checks if the database is currently healthy and reachable.
     */
    checkHealth(): Promise<boolean>;

    /**
     * Identifies if the database is currently in a read-only mode.
     */
    isReadOnly(): Promise<boolean>;

    /**
     * Retrieves the version of the underlying database engine.
     */
    getVersion(): Promise<string>;

    /**
     * Retrieves the current schema state or metadata.
     */
    getSchemaMetadata(): Promise<unknown>;
}
