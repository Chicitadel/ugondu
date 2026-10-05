/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Infrastructure Autopilot — Qualification Gates AUTO-01..26
 * File           : autopilot.qualification.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { AuthorityManager } from '../autonomy/authority';
import { AutonomyLevel } from '../autonomy/levels';
import { DecisionEvidenceStore } from '../evidence/decision-evidence';
import { ApdlParser } from '../policy/apdl';
import { PolicyVersioning } from '../policy/versioning';
import { DriftReconciler } from '../reconciliation/drift';
import { RemediationPlanner } from '../remediation/planner';
import { BudgetManager } from '../safety/budget';
import { RateLimiter } from '../safety/rate-limit';
import * as crypto from 'crypto';

declare var describe: any;
declare var it: any;
declare var expect: any;

describe(__t('infrastructure_autopilot_quali'), () => {
  it(__t('auto_01_06_autonomy_levels_l0_'), () => {
    const am = new AuthorityManager();
    expect(am.checkAuthority('bot-1')).toBe(AutonomyLevel.L0_MANUAL);
    am.delegateAuthority('bot-1', AutonomyLevel.L4_HIGH_AUTONOMY, 3600);
    expect(am.checkAuthority('bot-1')).toBe(AutonomyLevel.L4_HIGH_AUTONOMY);
    am.revokeAuthority('bot-1');
    expect(am.checkAuthority('bot-1')).toBe(AutonomyLevel.L0_MANUAL);
  });

  it(__t('auto_07_10_drift_detection_and'), () => {
    const reconciler = new DriftReconciler();
    const planner = new RemediationPlanner();
    const driftRes = reconciler.reconcile({ resourceId: 'res-web-1' });
    expect(driftRes.reconciled).toBe(true);
    const plan = planner.plan({ incidentId: 'inc-1', faultType: 'CONFIG_DRIFT' });
    expect(plan.steps.length).toBeGreaterThan(0);
  });

  it(__t('auto_11_15_safety_budget_rate_'), () => {
    const budget = new BudgetManager();
    const limiter = new RateLimiter();
    const b = { maxCostPerExecution: 10, dailyLimit: 100, currency: 'EUR' };
    expect(budget.checkBudget(5, b)).toBe(true);
    budget.deductCost(5);
    expect(budget.getSpentToday()).toBe(5);
    expect(limiter.checkLimit('actor-1', { maxRequests: 5, timeWindowSeconds: 60 })).toBe(true);
  });

  it('AUTO-16..20: Policy versioning & reconciliation lifecycle', () => {
    const versioning = new PolicyVersioning();
    expect(versioning.getActiveVersion('pol-1')).toBe('v1.0.0');
    versioning.trackChanges('pol-1', { updated: true });
    expect(versioning.getActiveVersion('pol-1')).toBe('v1.0.1');
  });

  it(__t('auto_21_26_apdl_policy_executi'), () => {
    const parser = new ApdlParser();
    const store = new DecisionEvidenceStore();
    const rules = parser.parse('[{"ruleId":"r1","condition":"true","action":"restart","priority":1}]');
    expect(rules.length).toBe(1);

    const snapshot = { tested: true };
    const hash = crypto.createHash('sha256').update(JSON.stringify({
      decisionId: 'dec-1',
      timestamp: '2026-10-03',
      contextSnapshot: snapshot,
      appliedPolicies: ['r1']
    })).digest('hex');

    store.storeEvidence({
      decisionId: 'dec-1',
      timestamp: '2026-10-03',
      contextSnapshot: snapshot,
      appliedPolicies: ['r1'],
      cryptographicHash: hash
    });
    expect(store.count()).toBe(1);
  });
});
