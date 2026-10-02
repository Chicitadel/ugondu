/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport Gatekeeper
 * File           : client.ts
 * Version        : 1.0.0
 * Author         : Engineering Team
 * Organization   : Air Roofers
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-02
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

export interface DatabaseClient {
    query(sql: string, params?: any[]): Promise<{ rows: any[] }>;
    execute(sql: string, params?: any[]): Promise<void>;
    find<T>(collection: string, query: Record<string, unknown>): Promise<T[]>;
    findOne<T>(collection: string, id: string): Promise<T | null>;
    save<T>(collection: string, document: T): Promise<void>;
    delete(collection: string, id: string): Promise<void>;
}
