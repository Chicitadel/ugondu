/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Shared
 * File           : logger.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 *
 * Governance:
 * - AI Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

export class Logger {
    public static info(message: string, context?: Record<string, any>): void {
        if (process.env.NODE_ENV !== 'test') {
            console.log(JSON.stringify({ level: 'INFO', timestamp: new Date().toISOString(), message, context }));
        }
    }

    public static warn(message: string, context?: Record<string, any>): void {
        if (process.env.NODE_ENV !== 'test') {
            console.warn(JSON.stringify({ level: 'WARN', timestamp: new Date().toISOString(), message, context }));
        }
    }

    public static error(message: string, error?: any, context?: Record<string, any>): void {
        if (process.env.NODE_ENV !== 'test') {
            console.error(JSON.stringify({ level: 'ERROR', timestamp: new Date().toISOString(), message, error: error?.message || error, context }));
        }
    }
}
