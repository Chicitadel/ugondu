/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Autopilot / Safety
 * File           : maintenance-window.ts
 * Version        : 1.0.0
 * Author         : Core Architecture Team
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
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

export interface MaintenanceWindow {
    startTime: Date;
    endTime: Date;
    allowCriticalOperations: boolean;
}

/**
 * @class MaintenanceManager
 * @description Corporate Governed class implementation for MaintenanceManager
 * @classification ENTERPRISE
 */
export class MaintenanceManager {
    public isInWindow(window: MaintenanceWindow, date: Date = new Date()): boolean {
        return date >= window.startTime && date <= window.endTime;
    }

    public canExecute(operationType: string, window: MaintenanceWindow): boolean {
        if (!this.isInWindow(window)) return true;
        return window.allowCriticalOperations && operationType === 'CRITICAL';
    }
}
