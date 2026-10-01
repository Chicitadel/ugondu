/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Fabric Capabilities Engine
 * File           : backup.ts
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

export interface BackupCapability {
  scheduleBackup(targetId: string, cron: string): Promise<string>;
  cancelBackupSchedule(scheduleId: string): Promise<void>;
}
