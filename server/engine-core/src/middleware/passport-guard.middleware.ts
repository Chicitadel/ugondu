/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport Guard Middleware
 * File           : passport-guard.middleware.ts
 * Version        : 1.0.0
 * Author         : Engineering Team
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

import { Request, Response, NextFunction } from 'express';
import { admissionController } from '../passport/gatekeeper/admission-controller';
import { __t } from '@ugondu/shared';

export function passportGuardMiddleware(req: Request, res: Response, next: NextFunction): any {
    const passportId = req.headers['x-ugondu-passport-id'] as string;
    
    if (!passportId) {
        console.warn('Audit: Missing X-Ugondu-Passport-Id header');
        return res.status(403).json({
            error: __t('err_passport_required'),
            code: 'PASSPORT_REQUIRED'
        });
    }

    const result = admissionController.admit(passportId, { tenantId: req.body?.tenantId });
    if (result.status !== 'ADMITTED') {
        return res.status(403).json({
            error: __t('err_passport_rejected'),
            code: 'PASSPORT_REJECTED'
        });
    }

    return next();
}
