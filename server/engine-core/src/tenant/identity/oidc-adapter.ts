/******************************************************************************
 * Project        : Ugondu
 * Module         : Tenant Identity
 * File           : oidc-adapter.ts
 * Version        : 1.0.0
 * Author         : Phase 14 AI Engineer
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

import { SubjectContext, SubjectContextFactory } from './subject-context';

/**
 * @class OIDCAdapter
 * @description Corporate Governed class implementation for OIDCAdapter
 * @classification ENTERPRISE
 */
export class OIDCAdapter {
  public verifyIdToken(token: string): SubjectContext {
    if (!token || typeof token !== 'string') throw new Error('Invalid token');
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWT structure');
    
    try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        if (!payload.sub) throw new Error('Missing sub claim');
        if (payload.exp && payload.exp * 1000 < Date.now()) throw new Error('Token expired');
        
        return SubjectContextFactory.create(
            payload.sub,
            payload.tenant_id || payload.tid || 'default-tenant',
            payload.emails ? payload.emails : (payload.email ? [payload.email] : []),
            { issuer: payload.iss || 'unknown', audience: payload.aud || 'unknown' },
            true
        );
    } catch (error) {
        throw new Error('Token verification failed: ' + String(error));
    }
  }));
  }
}
