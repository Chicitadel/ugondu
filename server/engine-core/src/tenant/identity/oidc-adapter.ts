import { __t } from '@ugondu/shared';
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
 ******************************************************************************/

import { SubjectContext, SubjectContextFactory } from './subject-context';

export class OIDCAdapter {
  public verifyIdToken(token: string): SubjectContext {
    if (!token || typeof token !== 'string') throw new Error(__t('invalid_token'));
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error(__t('invalid_jwt_structure'));

    try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        if (!payload.sub) throw new Error(__t('missing_sub_claim'));
        if (payload.exp && payload.exp * 1000 < Date.now()) throw new Error(__t('token_expired'));

        return SubjectContextFactory.create(
            payload.sub,
            payload.tenant_id || payload.tid || 'default-tenant',
            payload.emails ? payload.emails : (payload.email ? [payload.email] : []),
            { issuer: payload.iss || 'unknown', audience: payload.aud || 'unknown' },
            true
        );
    } catch (error) {
        throw new Error(__t('token_verification_failed') + String(error));
    }
  }
}
