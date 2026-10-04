/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Autopilot / Modes
 * File           : manual.ts
 * Version        : 1.0.0
 * Author         : Core Architecture Team
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
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

// @ts-ignore
import { __t } from '@ugondu/shared';

/**
 * @class ManualModeHandler
 * @description Corporate Governed class implementation for ManualModeHandler
 * @classification ENTERPRISE
 */
export class ManualModeHandler {
    public execute(action: any, context: any): any {
        // Requires explicit user intervention and approval
        // Engine does not proceed without direct input
        throw new Error(__t('messages.error.manual_mode_action_requires_direct_user_execu'));
    }
}
