/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : engine-core/move/tests
 * File           : readiness.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { ReadinessEvaluator } from '../cutover/readiness';
import type { ReadinessCriteria } from '../cutover/readiness';
// @ts-ignore
import { __t } from '@ugondu/shared';

declare var describe: any;
declare var it: any;
declare var expect: any;

describe(__t('msg_cutover_readiness_evaluation'), () => {
  const strict: ReadinessCriteria = { requireZeroReplicationLag: true, requireActiveHealthChecks: true, maxAllowedErrorRate: 0.01 };

  it(__t('is_ready_when_all_probes_repor'), async () => {
    const evaluator = new ReadinessEvaluator({
      replicationLagMs: async () => 0,
      systemHealthy: async () => true,
      errorRate: async () => 0.001,
    });
    const result = await evaluator.evaluate(strict);
    expect(result.isReady).toBe(true);
    expect(result.reasons.length).toBe(0);
  });

  it(__t('blocks_cutover_on_replication_'), async () => {
    const evaluator = new ReadinessEvaluator({
      replicationLagMs: async () => 250,
      systemHealthy: async () => true,
      errorRate: async () => 0,
    });
    const result = await evaluator.evaluate(strict);
    expect(result.isReady).toBe(false);
    expect(result.reasons).toContain(__t('messages.error.readiness_replication_lag', { lag: 250 }));
  });

  it(__t('blocks_cutover_when_health_che'), async () => {
    const evaluator = new ReadinessEvaluator({
      replicationLagMs: async () => 0,
      systemHealthy: async () => false,
      errorRate: async () => 0,
    });
    const result = await evaluator.evaluate(strict);
    expect(result.isReady).toBe(false);
    expect(result.reasons).toContain(__t('messages.error.readiness_health_failed'));
  });

  it(__t('blocks_cutover_when_the_error_'), async () => {
    const evaluator = new ReadinessEvaluator({
      replicationLagMs: async () => 0,
      systemHealthy: async () => true,
      errorRate: async () => 0.5,
    });
    const result = await evaluator.evaluate(strict);
    expect(result.isReady).toBe(false);
    expect(result.reasons).toContain(__t('messages.error.readiness_error_rate', { errorRate: 0.5, maxAllowed: 0.01 }));
  });

  it(__t('fails_closed_when_no_probes_ar'), async () => {
    const result = await new ReadinessEvaluator().evaluate(strict);
    expect(result.isReady).toBe(false);
    expect(result.reasons.length).toBe(3);
  });

  it(__t('fails_closed_when_a_probe_retu'), async () => {
    const evaluator = new ReadinessEvaluator({
      replicationLagMs: async () => Number.NaN,
      systemHealthy: async () => true,
      errorRate: async () => Number.NaN,
    });
    const result = await evaluator.evaluate(strict);
    expect(result.isReady).toBe(false);
    expect(result.reasons.length).toBe(2);
  });
});
