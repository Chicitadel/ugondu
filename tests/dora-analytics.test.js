/******************************************************************************
 * Project        : Ugondu
 * Module         : Analytics
 * File           : dora-analytics.test.js
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
 * Copyright (c) 2026 Air Roofers Ltd
 * All Rights Reserved.
 ******************************************************************************/

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Compile dora.ts to js
const tsPath = path.resolve(__dirname, '../server/engine-core/src/analytics/dora.ts');
const jsPath = path.resolve(__dirname, '../server/engine-core/src/analytics/dora.js');

try {
  execSync(`npx tsc ${tsPath}`);
} catch (e) {
  console.log("Using SWC or direct import if TSC fails...", e.message);
}

// Load the compiled module
let dora;
try {
  dora = require(jsPath);
} catch (e) {
  console.error("Failed to load compiled DORA engine", e);
  process.exit(1);
}

const { DoraAnalyticsEngine, DoraTier, DeploymentStatus } = dora;

function runTests() {
  console.log('Running DORA Analytics Engine tests...');

  const MS_PER_DAY = 86400000;
  
  // Test 1: Elite Tier
  const eliteEvents = [
    {
      id: "evt1",
      status: DeploymentStatus.SUCCESS,
      triggerTimestampMs: 1000,
      completionTimestampMs: 2000, 
    },
    {
      id: "evt2",
      status: DeploymentStatus.SUCCESS,
      triggerTimestampMs: 80000000,
      completionTimestampMs: 80001000, 
    }
  ];

  const resultElite = DoraAnalyticsEngine.calculateMetrics(eliteEvents, MS_PER_DAY);
  assert.strictEqual(resultElite.performanceTier, DoraTier.ELITE, "Should be ELITE tier");
  assert.strictEqual(resultElite.deploymentFrequencyPerDay, 2);
  assert.strictEqual(resultElite.changeFailureRatePercentage, 0);

  // Test 2: High Tier (failure rate is higher, MTTR is longer)
  const highEvents = [
    {
      id: "evt3",
      status: DeploymentStatus.SUCCESS,
      triggerTimestampMs: 1000,
      completionTimestampMs: 2000,
    },
    {
      id: "evt4",
      status: DeploymentStatus.FAILED,
      triggerTimestampMs: 1000,
      completionTimestampMs: 2000,
      rollbackCompletionTimestampMs: 2000 + (3 * 3600000), // 3 hours
    },
    {
      id: "evt5",
      status: DeploymentStatus.SUCCESS,
      triggerTimestampMs: 1000,
      completionTimestampMs: 2000,
    },
    {
      id: "evt6",
      status: DeploymentStatus.SUCCESS,
      triggerTimestampMs: 1000,
      completionTimestampMs: 2000,
    }
  ];

  const resultHigh = DoraAnalyticsEngine.calculateMetrics(highEvents, 7 * MS_PER_DAY);
  assert.strictEqual(resultHigh.changeFailureRatePercentage, 25);
  assert.strictEqual(resultHigh.performanceTier, DoraTier.HIGH, "Should be HIGH tier");

  // Test 3: Rework Rate
  const reworkEvents = [
    {
      id: "evt7",
      status: DeploymentStatus.SUCCESS,
      triggerTimestampMs: 1000,
      completionTimestampMs: 2000,
      hotfixCompletionTimestampMs: 2000 + 3600000 // 1 hour hotfix -> rework
    },
    {
      id: "evt8",
      status: DeploymentStatus.SUCCESS,
      triggerTimestampMs: 1000,
      completionTimestampMs: 2000
    }
  ];
  
  const resultRework = DoraAnalyticsEngine.calculateMetrics(reworkEvents, MS_PER_DAY);
  assert.strictEqual(resultRework.deploymentReworkRatePercentage, 50, "Should have 50% rework rate");

  console.log('All tests passed!');
}

runTests();
