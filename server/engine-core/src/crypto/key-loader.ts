/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Cryptographic Key Loader Facade
 * File           : key-loader.ts
 * Version        : 3.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU / Ujomor Engineering
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-18
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 Type II / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

export {
    KeyMaterialSource,
    KeyState,
    KeyLoadErrorCode,
    KeyLoadError,
    FORBIDDEN_INSECURE_KEY_LITERALS,
    FORBIDDEN_INSECURE_KEY_LITERALS as FORBIDDEN_KEY_LITERALS,
    isForbiddenKeyLiteral,
    isManagedKeyReference,
    KeyLoader,
} from '../encryption/key-loader';
