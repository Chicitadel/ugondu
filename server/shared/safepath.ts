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

'use strict';

import * as path from 'path';

export class SafePathResolver {
    public static resolve(baseDir: string, userInput: string): string {
        if (!userInput || typeof userInput !== 'string') {
            throw new Error('PATH_EMPTY_OR_INVALID');
        }

        // Null byte injection check
        if (userInput.includes('\0')) {
            throw new Error('NULL_BYTE_INJECTION');
        }

        // Windows Alternate Data Streams (ADS)
        if (userInput.includes(':') && !/^[a-zA-Z]:[/\\]/.test(userInput)) {
            throw new Error('WINDOWS_ADS_DETECTED');
        }

        // UNC paths (Universal Naming Convention)
        if (userInput.startsWith('\\\\') || userInput.startsWith('//')) {
            throw new Error('UNC_PATH_DETECTED');
        }

        // Windows reserved device names
        const devMatch = userInput.match(/(?:^|[\\/])(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.[^\\/]*)?(?:$|[\\/])/i);
        if (devMatch) {
            throw new Error('WINDOWS_RESERVED_DEVICE_NAME');
        }

        // Normalization and boundary traversal check
        const normalized = path.normalize(userInput);
        const resolved = path.resolve(baseDir, normalized);
        const rel = path.relative(baseDir, resolved);

        if (rel.startsWith('..') || path.isAbsolute(rel)) {
            throw new Error('PATH_TRAVERSAL_DETECTED');
        }

        return resolved;
    }
}
