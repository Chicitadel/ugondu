/******************************************************************************
 * Project        : Ugondu
 * Module         : Analytics
 * File           : dora.ts
 * Version        : 1.0.0
 * Author         : Delivery Intelligence Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
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

export enum DoraTier {
  ELITE = "ELITE",
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW"
}

export enum DeploymentStatus {
  SUCCESS = "SUCCESS",
  FAILED = "FAILED",
  DEGRADED = "DEGRADED"
}

export interface DeploymentEvent {
  id: string;
  status: DeploymentStatus;
  triggerTimestampMs: number;
  completionTimestampMs: number;
  rollbackCompletionTimestampMs?: number;
  hotfixCompletionTimestampMs?: number;
}

export interface DoraMetricsResult {
  changeLeadTimeMs: number;
  deploymentFrequencyPerDay: number;
  failedDeploymentRecoveryTimeMs: number;
  changeFailureRatePercentage: number;
  deploymentReworkRatePercentage: number;
  performanceTier: DoraTier;
}

export class DoraAnalyticsEngine {
  private static readonly MS_PER_DAY = 86400000;
  private static readonly HOURS_24_MS = 86400000;

  public static calculateMetrics(events: DeploymentEvent[], timeWindowMs: number): DoraMetricsResult {
    if (!events || events.length === 0) {
      return {
        changeLeadTimeMs: 0,
        deploymentFrequencyPerDay: 0,
        failedDeploymentRecoveryTimeMs: 0,
        changeFailureRatePercentage: 0,
        deploymentReworkRatePercentage: 0,
        performanceTier: DoraTier.LOW
      };
    }

    const successfulEvents = events.filter(e => e.status === DeploymentStatus.SUCCESS);
    const failedEvents = events.filter(e => e.status === DeploymentStatus.FAILED || e.status === DeploymentStatus.DEGRADED);

    // 1. Change Lead Time
    let totalLeadTime = 0;
    for (const e of successfulEvents) {
      totalLeadTime += (e.completionTimestampMs - e.triggerTimestampMs);
    }
    const changeLeadTimeMs = successfulEvents.length > 0 ? totalLeadTime / successfulEvents.length : 0;

    // 2. Deployment Frequency
    const daysInWindow = Math.max(1, timeWindowMs / this.MS_PER_DAY);
    const deploymentFrequencyPerDay = events.length / daysInWindow;

    // 3. Failed Deployment Recovery Time (MTTR)
    let totalRecoveryTime = 0;
    let recoveredCount = 0;
    for (const e of failedEvents) {
      if (e.rollbackCompletionTimestampMs) {
        totalRecoveryTime += (e.rollbackCompletionTimestampMs - e.completionTimestampMs);
        recoveredCount++;
      }
    }
    const failedDeploymentRecoveryTimeMs = recoveredCount > 0 ? totalRecoveryTime / recoveredCount : 0;

    // 4. Change Failure Rate
    const changeFailureRatePercentage = (failedEvents.length / events.length) * 100;

    // 5. Deployment Rework Rate
    let reworkCount = 0;
    for (const e of events) {
      if (e.hotfixCompletionTimestampMs && (e.hotfixCompletionTimestampMs - e.completionTimestampMs) <= this.HOURS_24_MS) {
        reworkCount++;
      } else if (e.rollbackCompletionTimestampMs && (e.rollbackCompletionTimestampMs - e.completionTimestampMs) <= this.HOURS_24_MS) {
        reworkCount++;
      }
    }
    const deploymentReworkRatePercentage = (reworkCount / events.length) * 100;

    const performanceTier = this.calculateTier(
      deploymentFrequencyPerDay,
      changeLeadTimeMs,
      failedDeploymentRecoveryTimeMs,
      changeFailureRatePercentage
    );

    return {
      changeLeadTimeMs,
      deploymentFrequencyPerDay,
      failedDeploymentRecoveryTimeMs,
      changeFailureRatePercentage,
      deploymentReworkRatePercentage,
      performanceTier
    };
  }

  private static calculateTier(
    freqPerDay: number,
    leadTimeMs: number,
    mttrMs: number,
    cfrPercentage: number
  ): DoraTier {
    const isEliteFreq = freqPerDay >= 1; 
    const isEliteLeadTime = leadTimeMs <= this.MS_PER_DAY; 
    const isEliteMttr = mttrMs <= 3600000; 
    const isEliteCfr = cfrPercentage <= 15; 

    if (isEliteFreq && isEliteLeadTime && isEliteMttr && isEliteCfr) {
      return DoraTier.ELITE;
    }

    const isHighFreq = freqPerDay >= (1 / 7); 
    const isHighLeadTime = leadTimeMs <= (7 * this.MS_PER_DAY);
    const isHighMttr = mttrMs <= (24 * 3600000);
    const isHighCfr = cfrPercentage <= 30;

    if (isHighFreq && isHighLeadTime && isHighMttr && isHighCfr) {
      return DoraTier.HIGH;
    }

    const isMedFreq = freqPerDay >= (1 / 30);
    const isMedLeadTime = leadTimeMs <= (30 * this.MS_PER_DAY);
    const isMedMttr = mttrMs <= (7 * 24 * 3600000);
    const isMedCfr = cfrPercentage <= 45;

    if (isMedFreq && isMedLeadTime && isMedMttr && isMedCfr) {
      return DoraTier.MEDIUM;
    }

    return DoraTier.LOW;
  }
}
