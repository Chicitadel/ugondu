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

export interface ObservationParams {
  providerId: string;
  response: any;
}

export interface ObservationRecord {
  providerId: string;
  providerResponseHash: string;
  observedState: any;
  timestamp: string;
  status: 'PROVEN' | 'NOT_PROVEN';
}

export class EvidenceCollector {
  recordProviderObservation(params: ObservationParams): ObservationRecord {
    if (!params.response) {
      return {
        providerId: params.providerId,
        providerResponseHash: '',
        observedState: null,
        timestamp: new Date().toISOString(),
        status: 'NOT_PROVEN'
      };
    }

    const canonicalBytes = ProviderResponseCanonicalizer.canonicalize(params.response);
    const hash = ProviderResponseHasher.hash(canonicalBytes);
    const state = ObservedStateDeriver.derive(params.response);

    return {
      providerId: params.providerId,
      providerResponseHash: hash,
      observedState: state,
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
