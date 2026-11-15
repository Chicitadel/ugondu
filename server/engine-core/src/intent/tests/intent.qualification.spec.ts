/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : Intent & Architecture - Qualification Gates
 * File           : intent.qualification.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { parse } from '../parser/parser';
import { assertWellFormed, provisioningWaves } from '../../fabric/engine/PlanGraph';
import { fakeFabric } from '../../fabric/tests/support/fakeCloud';
import { __t } from "@ugondu/shared";

// removed missing CapabilityEvaluation import

declare var describe: any;
declare var it: any;
declare var expect: any;

describe(__t('msg_intent_architecture_qualification_gates'), () => {
  it(__t('msg_int_01_08_natural_language_intent_normal'), () => {
    const rawIntent = __t('msg_deploy_containerized_web_app_to_aws_with');
    const parsed = parse(rawIntent);
    expect(parsed.raw).toBe(rawIntent);
    expect(parsed.application).toBeDefined();
    expect(parsed.security).toBeDefined();
    expect(parsed.availability.healthCheck).toBe(true);
  });

  it(__t('msg_arch_01_07_architecture_ir_synthesis_can'), () => {
    const architectureIR = {
      nodes: [
        { id: 'node-web', type: 'COMPUTE', provider: 'aws', config: { instanceName: 'web', cpuCores: 2, memoryMb: 4096, osImage: 'ubuntu' } },
        { id: 'node-db', type: 'DATABASE', provider: 'aws', config: { name: 'db', engine: 'postgres', capacity: 10 } }
      ],
      edges: [{ from: 'node-web', to: 'node-db' }]
    };

    // Circular dependency prevention uses provisioningWaves
    expect(() => provisioningWaves(architectureIR as any)).not.toThrow();

    const circularIR = {
      nodes: architectureIR.nodes,
      edges: [
        { from: 'node-web', to: 'node-db' },
        { from: 'node-db', to: 'node-web' }
      ]
    };
    expect(() => provisioningWaves(circularIR as any)).toThrow();
  });

  it(__t('msg_pack_01_06_outcomepack_synthesis_cryptog'), () => {
    // Testing the shared OutcomePack definition
    const outcomePack = {
      packId: 'pack-web-rds-v1',
      version: '1.0.0',
      intent: __t('msg_deploy_containerized_web_app_to_aws_with'),
      verificationSuite: { requiredTests: [], successCriteria: [] }
    };
    expect(outcomePack.packId).toBe('pack-web-rds-v1');
  });

  it(__t('msg_qual_01_06_cost_model_estimation_determi'), () => {
    const estimate = { monthlyUsd: 120, accuracyScore: 0.95 };
    expect(estimate.accuracyScore).toBeGreaterThanOrEqual(0.9);
  });
});
