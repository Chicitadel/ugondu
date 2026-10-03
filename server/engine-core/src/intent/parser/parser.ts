/******************************************************************************
 * Project        : Ugondu
 * Module         : Intent Engine
 * File           : parser.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
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

// @ts-ignore
import { __t } from '../../../../shared/i18n';

import { DecomposedIntent } from '../model/requirements';
import { parseApplicationRequirements } from '../rules/application-rules';
import { parseOperationalRequirements } from '../rules/operational-rules';
import { parseSecurityRequirements } from '../rules/security-rules';

export function parse(intentText: string): DecomposedIntent {
    if (!intentText || typeof intentText !== 'string' || intentText.trim() === '') {
        throw new Error(__t('messages.error.intent_text_cannot_be_null_undefined_or_empty'));
    }

    const text = intentText.toLowerCase();

    return {
        raw: intentText,
        application: parseApplicationRequirements(text),
        operational: parseOperationalRequirements(text),
        security: parseSecurityRequirements(text),
        availability: {
            healthCheck: true,
            restartPolicy: 'always',
            redundancy: 'single-zone',
            uptimeTarget: null
        }
    };
}
