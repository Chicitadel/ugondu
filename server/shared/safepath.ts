/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / SafePath Resolver
 * File           : safepath.ts
 * Version        : 3.0.0
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
 * - OWASP ASVS 5.0 (V12.1 File Path Protection)
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

// @ts-ignore
import { __t } from './i18n';

'use strict';

import * as path from 'path';

export class SafePathResolver {
    public static resolve(baseDir: string, userInput: string): string {
        if (!userInput || typeof userInput !== 'string') {
            throw new Error(__t('messages.error.path_empty_or_invalid'));
        }

        // Null byte injection check
        if (userInput.includes('\0')) {
            throw new Error(__t('messages.error.null_byte_injection'));
        }

        // Windows Alternate Data Streams (ADS)
        if (userInput.includes(':') && !/^[a-zA-Z]:[/\\]/.test(userInput)) {
            throw new Error(__t('messages.error.windows_ads_detected'));
        }

        // UNC paths (Universal Naming Convention)
        if (userInput.startsWith('\\\\') || userInput.startsWith('//')) {
            throw new Error(__t('messages.error.unc_path_detected'));
        }

        // Windows reserved device names
        const devMatch = userInput.match(/(?:^|[\\/])(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.[^\\/]*)?(?:$|[\\/])/i);
        if (devMatch) {
            throw new Error(__t('messages.error.windows_reserved_device_name'));
        }

        // Normalization and boundary traversal check
        const normalized = path.normalize(userInput);
        const resolved = path.resolve(baseDir, normalized);
        const rel = path.relative(baseDir, resolved);

        if (rel.startsWith('..') || path.isAbsolute(rel)) {
            throw new Error(__t('messages.error.path_traversal_detected'));
        }

        return resolved;
    }
}
