import * as crypto from 'crypto';

export class ProviderResponseCanonicalizer {
  static canonicalize(response: any): Buffer {
    if (!response) {
      return Buffer.from('');
    }
    // Strip volatile fields
    const stripped = { ...response };
    delete stripped.timestamp;
    delete stripped.latencyMs;
    delete stripped.requestId;

    const sorted = this.sortKeys(stripped);
    return Buffer.from(JSON.stringify(sorted), 'utf8');
  }

  private static sortKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortKeys(item));
    }
    const sorted: any = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = this.sortKeys(obj[key]);
    });
    return sorted;
  }
}

export class ProviderResponseHasher {
  static hash(canonicalBytes: Buffer): string {
    if (canonicalBytes.length === 0) return '';
    return crypto.createHash('sha256').update(canonicalBytes).digest('hex');
  }
}

export class ObservedStateDeriver {
  static derive(response: any): any {
    if (!response) return null;
    // Derive an immutable snapshot of state.
    const stripped = { ...response };
    delete stripped.timestamp;
    delete stripped.latencyMs;
    delete stripped.requestId;
    return stripped;
  }
}

export interface PhysicalProviderObservation {
  provider: string;
  accountId: string;
  region: string;
  operation: string;
  request: any;
  mutationResponse?: any;
  verificationRequest?: any;
  verificationResponse?: any;
  resourceIdentity: string;
  expectedState: any;
  observedState: any;
  executionContext: string;
}

export interface ObservationRecord {
  provider: string;
  operation: string;
  request: any;
  response: any;
  verification: any;
  resourceIdentity: string;
  executionContext: string;
  providerResponseHash: string;
  observedState: any;
  timestamp: string;
  status: 'PROVEN' | 'NOT_PROVEN';
}

export class EvidenceCollector {
  recordProviderObservation(params: PhysicalProviderObservation): ObservationRecord {
    const isProven = !!(
      params.mutationResponse &&
      params.verificationResponse &&
      params.observedState &&
      JSON.stringify(params.expectedState) === JSON.stringify(params.observedState)
    );

    if (!isProven) {
      return {
        provider: params.provider,
        operation: params.operation,
        request: params.request,
        response: params.mutationResponse || null,
        verification: params.verificationResponse || null,
        resourceIdentity: params.resourceIdentity,
        executionContext: params.executionContext,
        providerResponseHash: '',
        observedState: params.observedState || null,
        timestamp: new Date().toISOString(),
        status: 'NOT_PROVEN'
      };
    }

    const canonicalBytes = ProviderResponseCanonicalizer.canonicalize(params.mutationResponse);
    const hash = ProviderResponseHasher.hash(canonicalBytes);

    return {
      provider: params.provider,
      operation: params.operation,
      request: params.request,
      response: params.mutationResponse,
      verification: params.verificationResponse,
      resourceIdentity: params.resourceIdentity,
      executionContext: params.executionContext,
      providerResponseHash: hash,
      observedState: params.observedState,
      timestamp: new Date().toISOString(),
      status: 'PROVEN'
    };
  }
}

export class EvidenceValidator {
  static verify(record: ObservationRecord, response: any): boolean {
    if (!response) {
      return record.status === 'NOT_PROVEN';
    }

    if (record.status === 'PROVEN' && !record.providerResponseHash) {
      return false; // "PROVEN" without evidence
    }

    if (record.status === 'PROVEN') {
      const canonicalBytes = ProviderResponseCanonicalizer.canonicalize(response);
      const expectedHash = ProviderResponseHasher.hash(canonicalBytes);
      if (record.providerResponseHash !== expectedHash) {
        return false;
      }
    }

    return true;
  }
}
