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

export interface StorageMetrics {
    usedBytes: number;
    totalBytes: number;
}

export type DiskPressureState = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';

export interface SafetyDeclaration {
    isValidated: boolean;
    signatures: string[];
}

export interface Action {
    safetyDeclaration?: SafetyDeclaration;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface PreflightRequest {
    isAuthenticated: boolean;
    hasRequiredRoles: boolean;
    action: Action;
}

export type PreflightDecision = 'ALLOW' | 'BLOCK' | 'DEFER' | 'ALLOW_WITH_APPROVAL';

export interface AdmissionState {
    storageMetrics: StorageMetrics;
    detectedDriftLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

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

export interface EmergencyResult {
    success: boolean;
    message: string;
    timestamp: string;
}

export interface StateDigest {
    hash: string;
    version?: string;
}

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
