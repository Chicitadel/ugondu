/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Doctor — RCA Auth Error Codes
 * File           : auth-error-codes.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-02
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

/**
 * Provider-specific authorization error code patterns.
 * Used by the RCA Analyzer to classify authorization failures.
 * NEVER hardcode these inline in the analyzer — update this file.
 */
export const AUTH_ERROR_PATTERNS: Record<string, string[]> = {
  AWS: [
    'AccessDenied',
    'AccessDeniedException',
    'AuthFailure',
    'NotAuthorized',
    'UnauthorizedAccess',
    'InvalidClientTokenId',
  ],
  KUBERNETES: [
    'Forbidden',
    'FORBIDDEN',
    '403',
    'cannot get',
    'cannot create',
    'cannot delete',
    'cannot update',
    'is forbidden',
  ],
  AZURE: [
    'AuthorizationFailed',
    'Forbidden',
    'InsufficientPermissions',
    '403',
  ],
  GCP: [
    'PERMISSION_DENIED',
    'IAM_PERMISSION_DENIED',
    '403',
  ],
  LINUX: [
    'Permission denied',
    'Operation not permitted',
    'EACCES',
    'EPERM',
    'sudo: command not found',
    'is not in the sudoers file',
  ],
  CPANEL: [
    'Permission denied',
    'Access denied',
    'Unauthorized',
  ],
  HTTP: [
    '401',
    '403',
    'Unauthorized',
    'Forbidden',
  ],
};

/** Check if a provider error code indicates an authorization failure. */
export function isAuthorizationError(errorCode: string, provider?: string): boolean {
  const normalizedCode = errorCode.trim();
  if (provider) {
    const patterns = AUTH_ERROR_PATTERNS[provider.toUpperCase()];
    if (patterns) {
      return patterns.some((p) => normalizedCode.includes(p));
    }
  }
  // Fall back: check all known patterns
  return Object.values(AUTH_ERROR_PATTERNS)
    .flat()
    .some((p) => normalizedCode.includes(p));
}
