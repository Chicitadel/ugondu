'use strict';
/******************************************************************************
 * Project        : Ugondu
 * Module         : Analytics
 * File           : dora.ts
 * Version        : 2.0.0
 * Author         : Delivery Intelligence Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
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
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd
 * All Rights Reserved.
 ******************************************************************************/
Object.defineProperty(exports, "__esModule", { value: true });
exports.DoraAnalyticsEngine = exports.DeploymentStatus = exports.EvidenceKind = exports.DoraTier = void 0;
var DoraTier;
(function (DoraTier) {
    DoraTier["ELITE"] = "ELITE";
    DoraTier["HIGH"] = "HIGH";
    DoraTier["MEDIUM"] = "MEDIUM";
    DoraTier["LOW"] = "LOW";
})(DoraTier || (exports.DoraTier = DoraTier = {}));
var EvidenceKind;
(function (EvidenceKind) {
    EvidenceKind["MEASURED"] = "MEASURED";
    EvidenceKind["CALCULATED"] = "CALCULATED";
    EvidenceKind["BENCHMARK"] = "BENCHMARK";
    EvidenceKind["PROJECTED"] = "PROJECTED";
})(EvidenceKind || (exports.EvidenceKind = EvidenceKind = {}));
var DeploymentStatus;
(function (DeploymentStatus) {
    DeploymentStatus["SUCCESS"] = "SUCCESS";
    DeploymentStatus["FAILED"] = "FAILED";
    DeploymentStatus["DEGRADED"] = "DEGRADED";
})(DeploymentStatus || (exports.DeploymentStatus = DeploymentStatus = {}));
/**
 * @class DoraAnalyticsEngine
 * @description Corporate Governed class implementation for DoraAnalyticsEngine
 * @classification ENTERPRISE
 */
var DoraAnalyticsEngine = /** @class */ (function () {
    function DoraAnalyticsEngine() {
    }
    DoraAnalyticsEngine.calculateMetrics = function (events, timeWindowMs) {
        if (!events || events.length === 0) {
            return {
                changeLeadTimeMs: 0,
                deploymentFrequencyPerDay: 0,
                failedDeploymentRecoveryTimeMs: 0,
                changeFailureRatePercentage: 0,
                deploymentReworkRatePercentage: 0,
                performanceTier: DoraTier.LOW,
                evidenceKinds: {
                    changeLeadTimeMs: EvidenceKind.MEASURED,
                    deploymentFrequencyPerDay: EvidenceKind.MEASURED,
                    failedDeploymentRecoveryTimeMs: EvidenceKind.CALCULATED,
                    changeFailureRatePercentage: EvidenceKind.CALCULATED,
                    deploymentReworkRatePercentage: EvidenceKind.CALCULATED,
                    performanceTier: EvidenceKind.BENCHMARK
                }
            };
        }
        var successfulEvents = events.filter(function (e) { return e.status === DeploymentStatus.SUCCESS; });
        var failedEvents = events.filter(function (e) { return e.status === DeploymentStatus.FAILED || e.status === DeploymentStatus.DEGRADED; });
        // 1. Change Lead Time
        var totalLeadTime = 0;
        for (var _i = 0, successfulEvents_1 = successfulEvents; _i < successfulEvents_1.length; _i++) {
            var e = successfulEvents_1[_i];
            totalLeadTime += (e.completionTimestampMs - e.triggerTimestampMs);
        }
        var changeLeadTimeMs = successfulEvents.length > 0 ? totalLeadTime / successfulEvents.length : 0;
        // 2. Deployment Frequency
        var daysInWindow = Math.max(1, timeWindowMs / this.MS_PER_DAY);
        var deploymentFrequencyPerDay = events.length / daysInWindow;
        // 3. Failed Deployment Recovery Time (MTTR)
        var totalRecoveryTime = 0;
        var recoveredCount = 0;
        for (var _a = 0, failedEvents_1 = failedEvents; _a < failedEvents_1.length; _a++) {
            var e = failedEvents_1[_a];
            if (e.rollbackCompletionTimestampMs) {
                totalRecoveryTime += (e.rollbackCompletionTimestampMs - e.completionTimestampMs);
                recoveredCount++;
            }
        }
        var failedDeploymentRecoveryTimeMs = recoveredCount > 0 ? totalRecoveryTime / recoveredCount : 0;
        // 4. Change Failure Rate
        var changeFailureRatePercentage = (failedEvents.length / events.length) * 100;
        // 5. Deployment Rework Rate
        var reworkCount = 0;
        for (var _b = 0, events_1 = events; _b < events_1.length; _b++) {
            var e = events_1[_b];
            if (e.hotfixCompletionTimestampMs && (e.hotfixCompletionTimestampMs - e.completionTimestampMs) <= this.HOURS_24_MS) {
                reworkCount++;
            }
            else if (e.rollbackCompletionTimestampMs && (e.rollbackCompletionTimestampMs - e.completionTimestampMs) <= this.HOURS_24_MS) {
                reworkCount++;
            }
        }
        var deploymentReworkRatePercentage = (reworkCount / events.length) * 100;
        var performanceTier = this.calculateTier(deploymentFrequencyPerDay, changeLeadTimeMs, failedDeploymentRecoveryTimeMs, changeFailureRatePercentage);
        return {
            changeLeadTimeMs: changeLeadTimeMs,
            deploymentFrequencyPerDay: deploymentFrequencyPerDay,
            failedDeploymentRecoveryTimeMs: failedDeploymentRecoveryTimeMs,
            changeFailureRatePercentage: changeFailureRatePercentage,
            deploymentReworkRatePercentage: deploymentReworkRatePercentage,
            performanceTier: performanceTier,
            evidenceKinds: {
                changeLeadTimeMs: EvidenceKind.MEASURED,
                deploymentFrequencyPerDay: EvidenceKind.MEASURED,
                failedDeploymentRecoveryTimeMs: EvidenceKind.CALCULATED,
                changeFailureRatePercentage: EvidenceKind.CALCULATED,
                deploymentReworkRatePercentage: EvidenceKind.CALCULATED,
                performanceTier: EvidenceKind.BENCHMARK
            }
        };
    };
    DoraAnalyticsEngine.calculateTier = function (freqPerDay, leadTimeMs, mttrMs, cfrPercentage) {
        var isEliteFreq = freqPerDay >= 1;
        var isEliteLeadTime = leadTimeMs <= this.MS_PER_DAY;
        var isEliteMttr = mttrMs <= 3600000;
        var isEliteCfr = cfrPercentage <= 15;
        if (isEliteFreq && isEliteLeadTime && isEliteMttr && isEliteCfr) {
            return DoraTier.ELITE;
        }
        var isHighFreq = freqPerDay >= (1 / 7);
        var isHighLeadTime = leadTimeMs <= (7 * this.MS_PER_DAY);
        var isHighMttr = mttrMs <= (24 * 3600000);
        var isHighCfr = cfrPercentage <= 30;
        if (isHighFreq && isHighLeadTime && isHighMttr && isHighCfr) {
            return DoraTier.HIGH;
        }
        var isMedFreq = freqPerDay >= (1 / 30);
        var isMedLeadTime = leadTimeMs <= (30 * this.MS_PER_DAY);
        var isMedMttr = mttrMs <= (7 * 24 * 3600000);
        var isMedCfr = cfrPercentage <= 45;
        if (isMedFreq && isMedLeadTime && isMedMttr && isMedCfr) {
            return DoraTier.MEDIUM;
        }
        return DoraTier.LOW;
    };
    DoraAnalyticsEngine.MS_PER_DAY = 86400000;
    DoraAnalyticsEngine.HOURS_24_MS = 86400000;
    return DoraAnalyticsEngine;
}());
exports.DoraAnalyticsEngine = DoraAnalyticsEngine;
