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
import { Logger } from '@ugondu/shared';

export function passportGuardMiddleware(req: Request, res: Response, next: NextFunction): any {
    const raw = req.headers['x-ugondu-passport-id'];

    // Normalise: Express may give a string[] for repeated headers; take the first value
    const passportId = (Array.isArray(raw) ? raw[0] : raw ?? '').trim();

    if (!passportId) {
        // Header entirely absent or empty string
        Logger.warn(__t('messages.system.audit_missing_x_ugondu_passport_id_header'));
        return res.status(403).json({
            error: __t('err_passport_required'),
            code: 'PASSPORT_REQUIRED'
        });
    }

    const result = admissionController.admit(passportId, { tenantId: req.body?.tenantId });
    if (result.status !== 'ADMITTED') {
        Logger.warn(__t('messages.system.audit_passport_rejected_id', { 'passportId': passportId }));
        return res.status(403).json({
            error: __t('err_passport_rejected'),
            code: 'PASSPORT_REJECTED'
        });
    }

    return next();
}
