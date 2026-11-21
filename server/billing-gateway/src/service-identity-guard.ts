/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Billing Gateway — Service Identity Guard Middleware
 * File           : service-identity-guard.ts
 * Version        : 2026.3.2-LTS
 * Author         : Ignatus Chika Ujomor
 * Organization   : Air Roofers SASU / Enterprise Governance
 * Created Date   : 2026-10-03
 * Last Modified  : 2026-11-05
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ignatus Chika Ujomor
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import express, { Request, Response, NextFunction } from 'express';
import { __t, verifyServiceIdentityToken } from '@ugondu/shared';

export function billingServiceIdentityGuard(req: Request, res: Response, next: NextFunction): any {
    const auth = req.headers.authorization;
    if (!auth || typeof auth !== 'string') {
        return res.status(401).json({
            error: __t('ui.responses.missing_service_token'),
            message: __t('auth_service_token_missing'),
        });
    }
    const match = auth.match(/^(?:\[[a-z-]+\]\s*)?Bearer\s+(.+)$/i);
    if (!match || !match[1]) {
        return res.status(401).json({
            error: __t('ui.responses.missing_service_token'),
            message: __t('auth_service_token_missing'),
        });
    }
    const result = verifyServiceIdentityToken(match[1].trim(), 'billing-gateway');
    if (!result.valid) {
        return res.status(result.status || 401).json({
            error: result.error,
            message: result.error,
        });
    }
    (req as any).serviceIdentity = result.payload;
    next();
}
