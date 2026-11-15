/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Server / Engine Core / URRE / Model
 * File           : types.ts
 * Version        : 1.0.0
 * Author         : Platform Architecture Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-02
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS 5.0, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import type { UppiePreflightContext } from '../admission/authorization-readiness';

/**
 * @interface StorageMetrics
 * @description Corporate Governed interface implementation for StorageMetrics
 * @classification ENTERPRISE
 */
export interface StorageMetrics {
    usedBytes: number;
    totalBytes: number;
}

export type DiskPressureState = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';

/**
 * @interface SafetyDeclaration
 * @description Corporate Governed interface implementation for SafetyDeclaration
 * @classification ENTERPRISE
 */
export interface SafetyDeclaration {
    isValidated: boolean;
    signatures: string[];
}

/**
 * @interface Action
 * @description Corporate Governed interface implementation for Action
 * @classification ENTERPRISE
 */
export interface Action {
    safetyDeclaration?: SafetyDeclaration;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';
    operationType?: string;
}

/**
 * @interface PreflightRequest
 * @description Corporate Governed interface implementation for PreflightRequest
 * @classification ENTERPRISE
 */
export interface PreflightRequest {
    isAuthenticated:  boolean;
    hasRequiredRoles: boolean;
    action:           Action;
    uppieContext?:    UppiePreflightContext;
}

export type PreflightDecision = 'ALLOW' | 'BLOCK' | 'DEFER' | 'ALLOW_WITH_APPROVAL';

/**
 * @interface AdmissionState
 * @description Corporate Governed interface implementation for AdmissionState
 * @classification ENTERPRISE
 */
export interface AdmissionState {
    storageMetrics: StorageMetrics;
    detectedDriftLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * @interface TargetContext
 * @description Corporate Governed interface implementation for TargetContext
 * @classification ENTERPRISE
 */
export interface TargetContext {
    systemState: string;
    reason: string;
    processManager: {
        terminateAll: () => Promise<void>;
        isolate: () => Promise<void>;
    };
    networkManager: {
        cutOff: () => Promise<void>;
    };
    scheduler: {
        pauseAll: () => Promise<void>;
    };
}

/**
 * @interface EmergencyResult
 * @description Corporate Governed interface implementation for EmergencyResult
 * @classification ENTERPRISE
 */
export interface EmergencyResult {
    success: boolean;
    message: string;
    timestamp: string;
}

/**
 * @interface StateDigest
 * @description Corporate Governed interface implementation for StateDigest
 * @classification ENTERPRISE
 */
export interface StateDigest {
    hash: string;
    version?: string;
}

/**
 * @interface TaskContext
 * @description Corporate Governed interface implementation for TaskContext
 * @classification ENTERPRISE
 */
export interface TaskContext {
    logger: {
        info: (msg: string) => void;
        warn: (msg: string) => void;
        error: (msg: string) => void;
    };
    signal: (sig: string) => void;
    policy: {
        strictDriftDetection: boolean;
    };
    taskId: string;
    state: {
        retryPolicy: {
            halted: boolean;
        };
        requiresManualIntervention: boolean;
    };
}

export type ReconciliationState = 'CONFIRMED_COMPLETE' | 'INCOMPLETE' | 'DRIFTED' | 'UNKNOWN' | 'CORRUPTED' | 'UNRECOVERABLE';

/**
 * @interface ReconciliationContext
 * @description Corporate Governed interface implementation for ReconciliationContext
 * @classification ENTERPRISE
 */
export interface ReconciliationContext {
    planned: {
        baseDigest: StateDigest;
        isComplete: boolean;
    };
    recorded: {
        isCorrupted: boolean;
        signatureValid: boolean;
    };
    observed: {
        isComplete: boolean;
    };
    provider: {
        isComplete: boolean;
    };
    target: {
        actualDigest: StateDigest;
    };
    taskContext: TaskContext;
}
