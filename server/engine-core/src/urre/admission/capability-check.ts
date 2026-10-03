/******************************************************************************
 * Project        : Ugondu
 * Module         : URRE
 * File           : capability-check.ts
 * Version        : 1.0.0
 * Author         : Architecture Authority
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

import { IProviderRecoveryAdapter } from '../providers/recovery-adapter';

export enum ExecutionMode {
    AUTOMATIC = 'AUTOMATIC',
    ASSISTED = 'ASSISTED',
    MANUAL = 'MANUAL'
}

/**
 * @interface OperationRequirements
 * @description Corporate Governed interface implementation for OperationRequirements
 * @classification ENTERPRISE
 */
export interface OperationRequirements {
    requiresAtomicRecovery: boolean;
    minimumCpuCores: number;
    minimumMemoryMb: number;
}

/**
 * @interface ProviderCapabilities
 * @description Corporate Governed interface implementation for ProviderCapabilities
 * @classification ENTERPRISE
 */
export interface ProviderCapabilities {
    supportsAtomicRecovery: boolean;
    availableCpuCores: number;
    availableMemoryMb: number;
}

/**
 * @class CapabilityCheck
 * @description Corporate Governed class implementation for CapabilityCheck
 * @classification ENTERPRISE
 */
export class CapabilityCheck {
    private recoveryAdapter?: IProviderRecoveryAdapter;

    constructor(recoveryAdapter?: IProviderRecoveryAdapter) {
        this.recoveryAdapter = recoveryAdapter;
    }

    /**
     * Checks operation requirements against target provider capabilities.
     * Determines execution degradation if requirements cannot be fully met.
     */
    public evaluateExecutionMode(reqs: OperationRequirements, caps: ProviderCapabilities): ExecutionMode {
        let mode = ExecutionMode.AUTOMATIC;

        // Check hardware constraints
        if (caps.availableCpuCores < reqs.minimumCpuCores || caps.availableMemoryMb < reqs.minimumMemoryMb) {
            mode = ExecutionMode.MANUAL;
            return mode;
        }

        // Check recovery capabilities
        if (reqs.requiresAtomicRecovery && !caps.supportsAtomicRecovery) {
            // Degrade to assisted mode if recovery is required but not naturally supported
            mode = ExecutionMode.ASSISTED;
        }

        // If recovery is required and we have an adapter, we can enhance the mode
        if (reqs.requiresAtomicRecovery && mode === ExecutionMode.ASSISTED && this.recoveryAdapter) {
            // Assume the adapter provides the necessary fallback support
            mode = ExecutionMode.AUTOMATIC;
        }

        return mode;
    }
}
