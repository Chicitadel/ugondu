/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport
 * File           : passport-registry.ts
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

import { DeliveryPassport } from '../model/passport';

export interface IPassportRegistry {
    save(passport: DeliveryPassport): Promise<void>;
    findById(id: string): Promise<DeliveryPassport | null>;
    listBySubject(subjectId: string): Promise<DeliveryPassport[]>;
}

export class InMemoryPassportRegistry implements IPassportRegistry {
    private store = new Map<string, DeliveryPassport>();

    public async save(passport: DeliveryPassport): Promise<void> {
        this.store.set(passport.id, JSON.parse(JSON.stringify(passport)));
    }

    public async findById(id: string): Promise<DeliveryPassport | null> {
        const passport = this.store.get(id);
        return passport ? JSON.parse(JSON.stringify(passport)) : null;
    }

    public async listBySubject(subjectId: string): Promise<DeliveryPassport[]> {
        const results: DeliveryPassport[] = [];
        for (const passport of this.store.values()) {
            if (passport.metadata.subjectId === subjectId) {
                results.push(JSON.parse(JSON.stringify(passport)));
            }
        }
        return results;
    }
}
