import { __t } from '../../../shared/i18n';
/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Autopilot / Policy
 * File           : apdl.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

export interface ApdlRule {
    ruleId: string;
    condition: string;
    action: string;
    priority: number;
}

/**
 * @class ApdlParser
 * @description Parser and serializer for the Autopilot Policy Definition Language.
 * @classification ENTERPRISE
 */
export class ApdlParser {
    public parse(policyDocument: string): ApdlRule[] {
        if (!policyDocument || policyDocument.trim().length === 0) {
            return [];
        }
        try {
            const parsed = JSON.parse(policyDocument);
            if (Array.isArray(parsed)) {
                const isValid = parsed.every(item => 
                    item && 
                    typeof item.ruleId === 'string' && 
                    typeof item.condition === 'string' && 
                    typeof item.action === 'string' &&
                    typeof item.priority === 'number'
                );
                if (!isValid) {
                    throw new Error(__t('apdlparseerror'));
                }
                return parsed;
            }
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.rules)) {
                return parsed.rules;
            }
            throw new Error(__t('apdlparseerror'));
        } catch (error) {
            throw new Error(__t('apdlparseerror'));
        }
    }

    public serialize(rules: ApdlRule[]): string {
        return JSON.stringify(rules, null, 2);
    }
}
