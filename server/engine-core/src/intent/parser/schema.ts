/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Intent Engine
 * File           : schema.ts
 * Version        : 1.0.0
 * Author         : Engineering Lead
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

export const IntentSchema = {
    name: "StructuredIntentSchema",
    version: "1.0.0",
    description: "Schema for validating parsed intents against core engine constraints",
    rules: [
        "Must contain at least one requirement",
        "Provenance must be explicitly tagged as USER_EXPLICIT or LLM_INFERRED",
        "Conflict detection routines must clear the capability map"
    ]
};
