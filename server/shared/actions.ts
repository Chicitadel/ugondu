/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Actions Protocol
 * File           : actions.ts
 * Version        : 2.0.0
 * Author         : Server & Cryptography Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
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
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

export interface FetchRepositoryPayload {
    url: string;
    branch: string;
}

export interface SyncEnvironmentPayload {
    strategy: 'quota-sync' | 'atomic';
}

export interface PruneReleasesPayload {
    retention: number;
}

export interface UpsellNoticePayload {
    message: string;
}

export interface NodeInstallPayload {
    packageManager?: 'npm' | 'yarn' | 'pnpm';
    lockfile?: string;
    workingDirectory?: string;
    production?: boolean;
    timeoutMs?: number;
}

export interface ComposerInstallPayload {
    command?: 'install' | 'update' | 'dump-autoload';
    noDev?: boolean;
    optimizeAutoloader?: boolean;
    workingDirectory?: string;
    timeoutMs?: number;
}

export type ActionType = 
    | 'FETCH_REPOSITORY'
    | 'SYNC_ENVIRONMENT'
    | 'PRUNE_RELEASES'
    | 'UPSELL_NOTICE'
    | 'NODE_INSTALL'
    | 'COMPOSER_INSTALL';

export interface TypedAction {
    action: ActionType;
    payload: any;
}
