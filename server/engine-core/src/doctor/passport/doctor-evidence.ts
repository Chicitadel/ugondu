/******************************************************************************
 * Project        : Air Roofers Platform
 * Module         : Doctor / Evidence
 * File           : doctor-evidence.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

export interface GatheredEvidence {
    evidenceId: string;
    gatheredAt: number;
    passportId?: string;
    indicators: string[];
    rawContext: Record<string, unknown>;
}

export class DoctorEvidence {
    public gather(context: { passportId?: string; indicators?: string[]; [key: string]: unknown }): GatheredEvidence {
        return {
            evidenceId: `ev-${Date.now()}`,
            gatheredAt: Date.now(),
            passportId: context?.passportId,
            indicators: context?.indicators || [],
            rawContext: context || {}
        };
    }
}
