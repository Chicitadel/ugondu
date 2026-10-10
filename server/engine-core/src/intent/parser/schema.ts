import { __t } from "@ugondu/shared";

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
    description: __t('schema_for_validating_parsed_i'),
    rules: [
        __t('must_contain_at_least_one_requ'),
        __t('msg_provenance_must_be_explicitly_tagged_as'),
        __t('conflict_detection_routines_mu')
    ]
};
