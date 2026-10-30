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
import { createHash } from 'crypto';
import { admissionController } from '../passport/gatekeeper/admission-controller';
import { __t } from '@ugondu/shared';
import { Logger } from '@ugondu/shared';

export function passportGuardMiddleware(req: Request, res: Response, next: NextFunction): any {
    const raw = req.headers['x-ugondu-passport-id'];

    // HTTP intermediaries may combine repeated header values into a comma-delimited
    // string. Passport credentials are single opaque values; ambiguity is rejected.
    const values = Array.isArray(raw) ? raw : (typeof raw === 'string' ? [raw] : []);
    if (values.length !== 1 || typeof values[0] !== 'string') {
        Logger.warn(__t('messages.system.audit_missing_x_ugondu_passport_id_header'));
        return res.status(403).json({
            error: __t('err_passport_required'),
            code: 'PASSPORT_REQUIRED'
        });
    }

    const passportId = values[0].trim();
    if (!passportId || passportId.length > 8192 || /[\\s,]/.test(passportId)) {
        Logger.warn(__t('messages.system.audit_missing_x_ugondu_passport_id_header'));
        return res.status(403).json({
            error: __t('err_passport_required'),
            code: 'PASSPORT_REQUIRED'
        });
    }

    const result = admissionController.admit(passportId, { tenantId: req.body?.tenantId });
    if (result.status !== 'ADMITTED') {
        // Never write bearer-like admission credentials to application logs.
        const fingerprint = createHash('sha256').update(passportId).digest('hex').slice(0, 16);
        Logger.warn(__t('messages.system.audit_passport_rejected_id', {
            'passportId': `sha256:${fingerprint}`
        }));
        return res.status(403).json({
            error: __t('err_passport_rejected'),
            code: 'PASSPORT_REJECTED'
        });
    }

    return next();
}
