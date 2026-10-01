/******************************************************************************
 * Project        : Ugondu
 * Module         : Fabric Capabilities
 * File           : interfaces.ts
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

export interface ComputeCapability {
    provision(config: any): Promise<any>;
    terminate(id: string): Promise<any>;
}

export interface DatabaseCapability {
    provision(config: any): Promise<any>;
    backup(id: string): Promise<any>;
}

export interface StorageCapability {
    provision(config: any): Promise<any>;
}

export interface NetworkCapability {
    provision(config: any): Promise<any>;
}
