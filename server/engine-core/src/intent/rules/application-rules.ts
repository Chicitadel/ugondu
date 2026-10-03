/******************************************************************************
 * Project        : Ugondu
 * Module         : Intent Engine
 * File           : application-rules.ts
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

import { ApplicationRequirements } from '../model/requirements';

export function parseApplicationRequirements(text: string): ApplicationRequirements {
    let runtime: string | null = null;
    if (/(node|nodejs|node\.js|express)/i.test(text)) runtime = 'nodejs';
    else if (/(php|laravel|wordpress)/i.test(text)) runtime = 'php';
    else if (/(python|django|flask|fastapi)/i.test(text)) runtime = 'python';
    else if (/(go\s|golang)/i.test(text)) runtime = 'go';

    let database: string | null = null;
    if (/(postgres|postgresql)/i.test(text)) database = 'postgresql';
    else if (/(mysql|mariadb)/i.test(text)) database = 'mysql';
    else if (/(mongo)/i.test(text)) database = 'mongodb';

    let port: number | null = null;
    const portMatch = text.match(/port\s+(\d+)/i);
    if (portMatch && portMatch[1]) {
        port = parseInt(portMatch[1], 10);
    }

    const buildRequired = /(docker|container)/i.test(text);

    let framework: string | null = null;
    if (/express/i.test(text)) framework = 'express';
    else if (/laravel/i.test(text)) framework = 'laravel';
    else if (/django/i.test(text)) framework = 'django';
    else if (/flask/i.test(text)) framework = 'flask';
    else if (/fastapi/i.test(text)) framework = 'fastapi';
    
    return {
        runtime,
        framework,
        port,
        database,
        buildRequired
    };
}
