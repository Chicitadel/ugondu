/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Tenant Management
 * File           : oidc-adapter.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - AI Governed
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

import { SubjectContext } from './subject-context';

export interface OidcClaims {
  sub: string;
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  scopes?: string[];
  [key: string]: any;
}

export class OidcAdapter {
  constructor(private issuerUrl: string, private clientId: string) {}

  public validateIdToken(claims: OidcClaims): SubjectContext {
    // Signature & expiration verification would occur prior to this step
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (claims.exp < currentTimestamp) {
      throw new Error('OIDC Token has expired');
    }

    const roles = Array.isArray(claims['roles']) ? claims['roles'] : [];
    const scopes = claims.scopes || [];

    return new SubjectContext(
      claims.sub,
      {
        issuer: claims.iss,
        provider: 'OIDC',
        ...claims
      },
      roles,
      scopes
    );
  }
}
