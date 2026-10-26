import { createHash } from 'node:crypto';
import { PolicyDigest, PolicyDigestInputError, PolicyDigestInputErrorCode } from './digest';

describe('PolicyDigest', () => {
  const digest = new PolicyDigest();

  it('returns a SHA-256 hex digest instead of a placeholder', () => {
    const result = digest.generate({ id: 'policy-1', version: '1', statements: [] });
    expect(result).toMatch(/^[a-f0-9]{64}$/);
    expect(result).not.toBe('digest-hash');
  });

  it('canonicalizes nested object keys recursively', () => {
    const left = { z: 1, nested: { y: true, a: ['x', { d: 4, c: 3 }] } };
    const right = { nested: { a: ['x', { c: 3, d: 4 }], y: true }, z: 1 };
    expect(digest.generate(left)).toBe(digest.generate(right));
  });

  it('canonicalizes JSON strings independently of whitespace and property order', () => {
    const compact = '{"version":"1","statement":{"effect":"ALLOW","actions":["read"],"resources":["*"]}}';
    const spaced = JSON.stringify({
      statement: { resources: ['*'], actions: ['read'], effect: 'ALLOW' },
      version: '1'
    }, null, 2);
    expect(digest.generate(compact)).toBe(digest.generate(spaced));
  });

  it('changes when policy content changes', () => {
    expect(digest.generate({ effect: 'ALLOW' })).not.toBe(digest.generate({ effect: 'DENY' }));
  });

  it('hashes literal non-JSON text exactly and deterministically', () => {
    const input = 'policy text v1';
    expect(digest.generate(input)).toBe(createHash('sha256').update(input, 'utf8').digest('hex'));
  });

  it('rejects unsupported JavaScript values rather than returning a false digest', () => {
    expect(() => digest.generate(undefined)).toThrow(PolicyDigestInputError);
    expect(() => digest.generate({ invalid: undefined })).toThrow(PolicyDigestInputError);
  });

  it('rejects circular and non-finite policy values', () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => digest.generate(circular)).toThrow(PolicyDigestInputError);
    expect(() => digest.generate({ cost: Number.NaN })).toThrow(PolicyDigestInputError);
  });


  it('uses stable typed error codes for invalid policy content', () => {
    expect(() => digest.generate({ cost: Number.NaN })).toThrow(
      expect.objectContaining({ code: PolicyDigestInputErrorCode.NON_FINITE_NUMBER })
    );
  });

  it('hashes Buffer input by its exact bytes', () => {
    const input = Buffer.from('policy bytes');
    expect(digest.generate(input)).toBe(createHash('sha256').update(input).digest('hex'));
  });
});
