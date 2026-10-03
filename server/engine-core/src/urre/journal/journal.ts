/******************************************************************************
 * Project        : URRE-2
 * Module         : engine-core/urre/journal
 * File           : journal.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering Team
 * Organization   : Air Roofers
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

export interface IJournalEntry {
    sequenceNumber: number;
    timestamp: number;
    operationType: string;
    payload: any;
    hash: string;
}

/**
 * @interface IExecutionJournal
 * @description Corporate Governed interface implementation for IExecutionJournal
 * @classification ENTERPRISE
 */
export interface IExecutionJournal {
    append(operationType: string, payload: any): Promise<IJournalEntry>;
    getEntry(sequenceNumber: number): Promise<IJournalEntry | null>;
    verifyIntegrity(): Promise<boolean>;
    getRecentEntries(limit: number): Promise<IJournalEntry[]>;
}
