import { ImpactAnalysis } from './impact';

describe('ImpactAnalysis semantic policy diff', () => {
  const analysis = new ImpactAnalysis();

  it('detects a changed rule even when the rule count is unchanged', () => {
    const result = analysis.analyzeChanges(
      { rules: [{ effect: 'ALLOW', actions: ['read'], resources: ['docs/*'] }] },
      { rules: [{ effect: 'DENY', actions: ['read'], resources: ['docs/*'] }] },
    );
    expect(result.diffSummary).toEqual({ addedRules: 1, removedRules: 1 });
    expect(result.riskLevel).toBe('HIGH');
    expect(result.requiresApproval).toBe(true);
  });

  it('treats object-key reordering as no semantic change', () => {
    const result = analysis.analyzeChanges(
      { rules: [{ effect: 'ALLOW', actions: ['read'], scope: { region: 'eu-west-3', account: 'a' } }] },
      { rules: [{ scope: { account: 'a', region: 'eu-west-3' }, actions: ['read'], effect: 'ALLOW' }] },
    );
    expect(result.diffSummary).toEqual({ addedRules: 0, removedRules: 0 });
    expect(result.riskLevel).toBe('LOW');
    expect(result.requiresApproval).toBe(false);
  });

  it('requires approval for newly added rules because they can expand permissions', () => {
    const result = analysis.analyzeChanges(
      { rules: [{ effect: 'ALLOW', actions: ['read'], resources: ['docs/*'] }] },
      { rules: [{ effect: 'ALLOW', actions: ['read'], resources: ['docs/*'] }, { effect: 'ALLOW', actions: ['write'], resources: ['docs/*'] }] },
    );
    expect(result.diffSummary).toEqual({ addedRules: 1, removedRules: 0 });
    expect(result.riskLevel).toBe('MEDIUM');
    expect(result.requiresApproval).toBe(true);
  });

  it('counts duplicate rules as a multiset rather than collapsing them', () => {
    const rule = { effect: 'DENY', actions: ['write'], resources: ['*'] };
    const result = analysis.analyzeChanges({ rules: [rule, rule] }, { rules: [rule] });
    expect(result.diffSummary).toEqual({ addedRules: 0, removedRules: 1 });
    expect(result.riskLevel).toBe('HIGH');
    expect(result.requiresApproval).toBe(true);
  });

  it('classifies unsupported values as high risk and requires approval', () => {
    const result = analysis.analyzeChanges({ rules: [] }, { rules: [{ invalid: undefined }] });
    expect(result.riskLevel).toBe('HIGH');
    expect(result.requiresApproval).toBe(true);
  });
});
