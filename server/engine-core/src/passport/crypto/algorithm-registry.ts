/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport
 * File           : algorithm-registry.ts
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - AI Governed
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

export enum SupportedAlgorithm {
    RSA_SHA256 = 'RSA-SHA256',
    RSA_SHA512 = 'RSA-SHA512',
    ED25519 = 'Ed25519'
}

export interface AlgorithmConfig {
    name: SupportedAlgorithm;
    nodeCryptoName: string;
    keyType: 'rsa' | 'ed25519';
}

export class AlgorithmRegistry {
    private algorithms: Map<SupportedAlgorithm, AlgorithmConfig> = new Map();

    constructor() {
        this.register({
            name: SupportedAlgorithm.RSA_SHA256,
            nodeCryptoName: 'RSA-SHA256',
            keyType: 'rsa'
        });
        this.register({
            name: SupportedAlgorithm.RSA_SHA512,
            nodeCryptoName: 'RSA-SHA512',
            keyType: 'rsa'
        });
        this.register({
            name: SupportedAlgorithm.ED25519,
            nodeCryptoName: 'Ed25519', // internally uses ed25519 specific signers usually, mapping to node format
            keyType: 'ed25519'
        });
    }

    public register(config: AlgorithmConfig): void {
        this.algorithms.set(config.name, config);
    }

    public get(name: SupportedAlgorithm): AlgorithmConfig {
        const config = this.algorithms.get(name);
        if (!config) {
            throw new Error(`Algorithm ${name} not supported`);
        }
        return config;
    }
}
