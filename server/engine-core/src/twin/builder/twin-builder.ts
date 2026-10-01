/******************************************************************************
 * Project        : Ugondu
 * Module         : engine-core/twin
 * File           : twin-builder.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
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

import { TwinProjector, TwinEvent, EnvironmentTwinState } from '../projection/projector';

export class TwinBuilder {
    private projector = new TwinProjector();
    private state: EnvironmentTwinState = { resources: new Map() };

    public build(events: TwinEvent[]): EnvironmentTwinState {
        this.state = this.projector.project(events, this.state);
        return this.state;
    }

    public getCurrentState(): EnvironmentTwinState {
        return this.state;
    }
}
