import { Resolver } from './resolver';
import { Effect } from './types';

describe('Resolver fail-closed policy evaluation', () => {
  const resolver = new Resolver();
  const baseRule = {
    effect: Effect.ALLOW,
    actions: ['s3:GetObject'],
    resources: ['arn:aws:s3:::docs/*'],
    principals: ['user:*'],
    conditions: { environment: 'prod' },
  };
  const baseContext = {
    action: 's3:GetObject',
    resource: 'arn:aws:s3:::docs/readme.txt',
    principal: 'user:alice',
    attributes: { environment: 'prod' },
    rules: [baseRule],
  };

  it('denies missing, malformed and empty policy context by default', () => {
    expect(resolver.resolve(undefined, undefined)).toBe('DENY');
    expect(resolver.resolve({}, undefined)).toBe('DENY');
    expect(resolver.resolve({ ...baseContext, rules: [] }, baseContext.resource)).toBe('DENY');
  });

  it('allows only when action, resource, principal and conditions all match', () => {
    expect(resolver.resolve(baseContext, baseContext.resource)).toBe('ALLOW');
    expect(resolver.resolve(baseContext, { arn: baseContext.resource })).toBe('ALLOW');
  });

  it('denies when action or resource is outside the policy scope', () => {
    expect(resolver.resolve({ ...baseContext, action: 's3:DeleteObject' }, baseContext.resource)).toBe('DENY');
    expect(resolver.resolve({ ...baseContext, resource: 'arn:aws:s3:::private/secret.txt' }, 'arn:aws:s3:::private/secret.txt')).toBe('DENY');
  });

  it('denies a request when the principal does not match', () => {
    expect(resolver.resolve({ ...baseContext, principal: 'user:bob' }, baseContext.resource)).toBe('DENY');
  });

  it('denies a request when an attribute condition does not match', () => {
    expect(resolver.resolve({ ...baseContext, attributes: { environment: 'dev' } }, baseContext.resource)).toBe('DENY');
  });

  it('applies explicit deny over any matching allow', () => {
    const deny = {
      effect: Effect.DENY,
      actions: ['s3:GetObject'],
      resources: ['arn:aws:s3:::docs/*'],
      principals: ['user:alice'],
    };
    expect(resolver.resolve({ ...baseContext, rules: [baseRule, deny] }, baseContext.resource)).toBe('DENY');
  });

  it('fails closed on malformed rules rather than treating them as an allow', () => {
    expect(resolver.resolve({ ...baseContext, rules: [{ effect: Effect.ALLOW }] }, baseContext.resource)).toBe('DENY');
    expect(resolver.resolve({ ...baseContext, rules: [null] }, baseContext.resource)).toBe('DENY');
  });

  it('denies when the explicit resource argument conflicts with the context resource', () => {
    expect(resolver.resolve(baseContext, 'arn:aws:s3:::docs/other.txt')).toBe('DENY');
  });
});
