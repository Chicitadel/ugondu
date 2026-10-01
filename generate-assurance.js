const fs = require('fs');
const path = require('path');

const BASE_DIR = 'd:/ujomor-platform/products/ugondu/server/engine-core/src/assurance';

function getHeader(fileName) {
return `/******************************************************************************
 * Project        : Ugondu
 * Module         : Assurance Engine
 * File           : ${fileName}
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

`;
}

const files = {
    'model/assurance.ts': `export enum AssuranceLevel {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

export interface AssuranceMetadata {
    readonly timestamp: number;
    readonly agentId: string;
    readonly environment: string;
}

export interface AssuranceRecord {
    readonly id: string;
    readonly level: AssuranceLevel;
    readonly metadata: AssuranceMetadata;
    readonly validUntil: number;
}
`,
    'model/recovery-point.ts': `export interface RecoveryPoint {
    readonly pointId: string;
    readonly systemStateHash: string;
    readonly timestamp: number;
    readonly createdBy: string;
    readonly previousPointId?: string;
}
`,
    'model/recovery-certificate.ts': `export interface RecoveryCertificate {
    readonly certificateId: string;
    readonly recoveryPointId: string;
    readonly issuerId: string;
    readonly signature: string;
    readonly issuedAt: number;
    readonly expiresAt: number;
}
`,
    'model/assurance-policy.ts': `import { AssuranceLevel } from './assurance';

export interface AssurancePolicy {
    readonly policyId: string;
    readonly requiredLevel: AssuranceLevel;
    readonly maxAgeMs: number;
    readonly strictMode: boolean;
}
`,
    'model/assurance-result.ts': `export interface AssuranceResult {
    readonly isCompliant: boolean;
    readonly errors: string[];
    readonly validatedAt: number;
    readonly certificateId?: string;
}
`,
    'model/verification-contract.ts': `export interface VerificationContract {
    readonly contractId: string;
    readonly targetHash: string;
    readonly requiredSignatures: number;
    readonly constraints: Record<string, unknown>;
}
`,
    'certification/certificate.ts': `import * as crypto from 'crypto';

export class Certificate {
    constructor(
        public readonly id: string,
        public readonly subject: string,
        public readonly publicKey: string,
        public readonly validFrom: number,
        public readonly validTo: number,
        public readonly issuerSignature: string
    ) {}

    public isExpired(currentTime: number = Date.now()): boolean {
        return currentTime > this.validTo;
    }

    public isNotYetValid(currentTime: number = Date.now()): boolean {
        return currentTime < this.validFrom;
    }
}
`,
    'certification/signer.ts': `import * as crypto from 'crypto';

export class CertificateSigner {
    constructor(private readonly privateKeyPem: string) {}

    public signData(data: string): string {
        const sign = crypto.createSign('SHA256');
        sign.update(data);
        sign.end();
        return sign.sign(this.privateKeyPem, 'base64');
    }

    public static generateKeyPair(): { publicKey: string; privateKey: string } {
        return crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
    }
}
`,
    'certification/validator.ts': `import * as crypto from 'crypto';
import { Certificate } from './certificate';

export class CertificateValidator {
    public verifySignature(data: string, signatureBase64: string, publicKeyPem: string): boolean {
        try {
            const verify = crypto.createVerify('SHA256');
            verify.update(data);
            verify.end();
            return verify.verify(publicKeyPem, signatureBase64, 'base64');
        } catch (error) {
            return false;
        }
    }

    public validateCertificate(cert: Certificate, issuerPublicKey: string): boolean {
        if (cert.isExpired() || cert.isNotYetValid()) {
            return false;
        }
        const dataToSign = \`\${cert.id}:\${cert.subject}:\${cert.publicKey}:\${cert.validFrom}:\${cert.validTo}\`;
        return this.verifySignature(dataToSign, cert.issuerSignature, issuerPublicKey);
    }
}
`,
    'certification/expiry.ts': `import { Certificate } from './certificate';

export class ExpiryManager {
    public static readonly DEFAULT_VALIDITY_MS = 1000 * 60 * 60 * 24 * 365; // 1 year

    public calculateExpiry(issueDate: number = Date.now(), validityMs: number = ExpiryManager.DEFAULT_VALIDITY_MS): number {
        return issueDate + validityMs;
    }

    public enforceExpiry(cert: Certificate): void {
        if (cert.isExpired()) {
            throw new Error(\`Certificate \${cert.id} has expired.\`);
        }
    }
}
`,
    'certification/revocation.ts': `export class RevocationList {
    private readonly revokedCertificates: Map<string, number> = new Map();

    public revokeCertificate(certificateId: string, timestamp: number = Date.now()): void {
        if (!this.revokedCertificates.has(certificateId)) {
            this.revokedCertificates.set(certificateId, timestamp);
        }
    }

    public isRevoked(certificateId: string): boolean {
        return this.revokedCertificates.has(certificateId);
    }

    public getRevocationTime(certificateId: string): number | undefined {
        return this.revokedCertificates.get(certificateId);
    }

    public clearRevocations(): void {
        this.revokedCertificates.clear();
    }
}
`,
    'evidence/collector.ts': `import * as crypto from 'crypto';

export interface Evidence {
    readonly id: string;
    readonly payload: string;
    readonly timestamp: number;
    readonly hash: string;
}

export class EvidenceCollector {
    public collectEvidence(payload: string): Evidence {
        const timestamp = Date.now();
        const id = crypto.randomUUID();
        const hash = crypto.createHash('sha256').update(\`\${id}:\${timestamp}:\${payload}\`).digest('hex');

        return {
            id,
            payload,
            timestamp,
            hash
        };
    }
}
`,
    'evidence/integrity.ts': `import * as crypto from 'crypto';
import { Evidence } from './collector';

export class EvidenceIntegrity {
    public verifyEvidence(evidence: Evidence): boolean {
        const expectedHash = crypto.createHash('sha256')
            .update(\`\${evidence.id}:\${evidence.timestamp}:\${evidence.payload}\`)
            .digest('hex');
        
        return expectedHash === evidence.hash;
    }

    public calculateBatchHash(evidences: Evidence[]): string {
        const hash = crypto.createHash('sha256');
        for (const ev of evidences) {
            hash.update(ev.hash);
        }
        return hash.digest('hex');
    }
}
`,
    'evidence/passport.ts': `import { Evidence } from './collector';
import { EvidenceIntegrity } from './integrity';

export class EvidencePassport {
    private readonly evidences: Evidence[] = [];
    private readonly integrityChecker = new EvidenceIntegrity();

    public addEvidence(evidence: Evidence): void {
        if (!this.integrityChecker.verifyEvidence(evidence)) {
            throw new Error('Evidence integrity check failed.');
        }
        this.evidences.push(evidence);
    }

    public getEvidences(): ReadonlyArray<Evidence> {
        return this.evidences;
    }

    public generatePassportHash(): string {
        return this.integrityChecker.calculateBatchHash(this.evidences);
    }
}
`
};

for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(BASE_DIR, relPath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, getHeader(path.basename(relPath)) + content, 'utf-8');
    console.log('Created: ' + fullPath);
}
