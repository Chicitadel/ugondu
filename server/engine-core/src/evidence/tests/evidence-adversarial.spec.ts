import { EvidenceCollector, EvidenceValidator, ObservationRecord } from '../evidence-engine';
import * as crypto from 'crypto';

describe('Evidence Engine Adversarial Tests', () => {
  const collector = new EvidenceCollector();

  it('fake hash -> NOT_PROVEN', () => {
    const response = { data: 'important', timestamp: 123456789 };
    const validRecord = collector.recordProviderObservation({ 
      provider: 'p1', 
      operation: 'TEST_OP',
      request: {},
      mutationResponse: response, 
      verificationResponse: { ok: true },
      resourceIdentity: 'urn:test:res',
      executionContext: 'ctx1', accountId: '123', region: 'us-east-1', expectedState: {}, observedState: {}
    });
    
    // Adversary tampers with the hash
    const fakeRecord: ObservationRecord = {
      ...validRecord,
      providerResponseHash: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
    };

    const isValid = EvidenceValidator.verify(fakeRecord, response);
    expect(isValid).toBe(false); // Indicates it would be evaluated as NOT_PROVEN
  });

  it('timestamp hash -> NOT_PROVEN', () => {
    const response = { data: 'important', timestamp: 123456789 };
    const validRecord = collector.recordProviderObservation({ 
      provider: 'p1', 
      operation: 'TEST_OP',
      request: {},
      mutationResponse: response, 
      verificationResponse: { ok: true },
      resourceIdentity: 'urn:test:res',
      executionContext: 'ctx1', accountId: '123', region: 'us-east-1', expectedState: {}, observedState: {}
    });

    // Adversary creates a hash that includes the volatile timestamp field
    // (Bypassing canonicalization)
    const rawBuffer = Buffer.from(JSON.stringify(response), 'utf8');
    const timestampHash = crypto.createHash('sha256').update(rawBuffer).digest('hex');

    const fakeRecord: ObservationRecord = {
      ...validRecord,
      providerResponseHash: timestampHash
    };

    const isValid = EvidenceValidator.verify(fakeRecord, response);
    expect(isValid).toBe(false);
  });

  it('"PROVEN" without evidence -> NOT_PROVEN', () => {
    const response = { data: 'important' };
    
    // Adversary claims PROVEN but provides no hash evidence
    const fakeRecord: ObservationRecord = {
      provider: 'p1',
      operation: 'TEST_OP',
      request: {},
      mutationResponse: { data: 'important' },
      verificationResponse: { ok: true },
      resourceIdentity: 'urn:test:res',
      executionContext: 'ctx1',
      providerResponseHash: '',
      observedState: { data: 'important' },
      timestamp: new Date().toISOString(),
      status: 'PROVEN'
    };

    const isValid = EvidenceValidator.verify(fakeRecord, response);
    expect(isValid).toBe(false);
  });

  it('missing response -> NOT_PROVEN', () => {
    // If there is no response from the provider
    const record = collector.recordProviderObservation({ 
      provider: 'p1', 
      operation: 'TEST_OP',
      request: {},
      mutationResponse: null,
      verificationResponse: { ok: true },
      resourceIdentity: 'urn:test:res',
      executionContext: 'ctx1', accountId: '123', region: 'us-east-1', expectedState: {}, observedState: {} 
    });
    
    expect(record.status).toBe('NOT_PROVEN');
    expect(record.providerResponseHash).toBe('');
    
    // And if an adversary tries to claim PROVEN for a missing mutationResponse:
    const fakeRecord: ObservationRecord = {
      provider: 'p1',
      operation: 'TEST_OP',
      request: {},
      mutationResponse: null,
      verificationResponse: { ok: true },
      resourceIdentity: 'urn:test:res',
      executionContext: 'ctx1',
      providerResponseHash: 'somehash',
      observedState: null,
      timestamp: new Date().toISOString(),
      status: 'PROVEN'
    };

    const isValid = EvidenceValidator.verify(fakeRecord, null);
    expect(isValid).toBe(false);
  });
});
