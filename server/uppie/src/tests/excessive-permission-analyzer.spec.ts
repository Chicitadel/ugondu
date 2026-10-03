/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Excessive Permission Analyzer
 * File           : excessive-permission-analyzer.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { ExcessivePermissionAnalyzer } from '../core/analyzer/ExcessivePermissionAnalyzer';
// @ts-ignore
import { __t } from '../../../shared/i18n';

declare var describe: any, it: any, expect: any;

const rule = (id: string, actions: string[], resources: string[], effect: 'allow' | 'deny' = 'allow') => ({ id, effect, actions, resources });

describe('ExcessivePermissionAnalyzer', () => {
  const analyzer = new ExcessivePermissionAnalyzer();

  it('scores a wildcard action on a wildcard resource as critical with a localized finding', () => {
    const [score] = analyzer.analyze([rule('r1', ['*'], ['*'])]);
    expect(score).toEqual({ ruleId: 'r1', score: 100, findings: [__t('messages.warning.wildcard_action_and_resource')] });
    expect(score?.findings[0]).not.toBe('messages.warning.wildcard_action_and_resource');
  });

  it('scores a single wildcard as high with its own localized finding', () => {
    const scores = analyzer.analyze([rule('a', ['*'], ['bucket/1']), rule('b', ['read'], ['*'])]);
    expect(scores).toEqual([
      { ruleId: 'a', score: 80, findings: [__t('messages.warning.wildcard_action')] },
      { ruleId: 'b', score: 80, findings: [__t('messages.warning.wildcard_resource')] },
    ]);
    expect(__t('messages.warning.wildcard_action')).not.toBe(__t('messages.warning.wildcard_resource'));
  });

  it('ignores deny rules, precise allow rules and empty input', () => {
    expect(analyzer.analyze([rule('d', ['*'], ['*'], 'deny'), rule('p', ['read'], ['bucket/1'])])).toEqual([]);
    expect(analyzer.analyze([])).toEqual([]);
    expect(analyzer.analyze(undefined as any)).toEqual([]);
  });
});
