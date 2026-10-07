'use strict';
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
  * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    static info(message, context) {
        if (process.env.NODE_ENV !== 'test') {
            console.log(JSON.stringify({ level: 'INFO', timestamp: new Date().toISOString(), message, context }));
        }
    }
    static warn(message, context) {
        if (process.env.NODE_ENV !== 'test') {
            console.warn(JSON.stringify({ level: 'WARN', timestamp: new Date().toISOString(), message, context }));
        }
    }
    static error(message, error, context) {
        if (process.env.NODE_ENV !== 'test') {
            console.error(JSON.stringify({ level: 'ERROR', timestamp: new Date().toISOString(), message, error: error?.message || error, context }));
        }
    }
}
exports.Logger = Logger;
