/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Open Agent Protocol (OAP)
 * File           : oap.ts
 * Version        : 2.0.0
 * Author         : Open Protocol Standards Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Standards: ISO 27001, SOC 2, OWASP ASVS, NIST SP 800-53
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import * as crypto from 'crypto';
import canonicalize from 'canonicalize';
import { __t } from '../i18n';

export type OapMessageType = 'HANDSHAKE' | 'ACTION_REQUEST' | 'ACTION_RESPONSE' | 'HEALTH' | 'DRAIN';

export interface OapEnvelope {
    protocolVersion: '1.0';
    messageId: string;
    sender: string;
    recipient: string;
    messageType: OapMessageType;
    timestamp: number;
    payload: Record<string, any>;
    signature?: string;
}

export interface OapHandshakePayload {
    supportedProtocols: string[];
    capabilities: string[];
    agentVersion: string;
    publicKeyPem: string;
}

export interface OapHandshakeResponse {
    accepted: boolean;
    negotiatedVersion: string;
    grantedCapabilities: string[];
    sessionId: string;
}

export class OpenAgentProtocol {
    public static readonly PROTOCOL_VERSION = '1.0';

    public static createMessage(
        sender: string,
        recipient: string,
        messageType: OapMessageType,
        payload: Record<string, any>,
        privateKey?: crypto.KeyObject
    ): OapEnvelope {
        const envelope: OapEnvelope = {
            protocolVersion: '1.0',
            messageId: `oap_${crypto.randomBytes(12).toString('hex')}`,
            sender,
            recipient,
            messageType,
            timestamp: Date.now(),
            payload
        };

        if (privateKey) {
            const canonical = canonicalize(envelope) || '';
            const sig = crypto.sign(null, Buffer.from(canonical), privateKey).toString('base64');
            envelope.signature = sig;
        }

        return envelope;
    }

    public static verifyMessage(envelope: OapEnvelope, publicKeyPem: string): boolean {
        if (!envelope.signature) return false;

        const { signature, ...data } = envelope;
        const canonical = canonicalize(data);
        if (!canonical) return false;

        try {
            const pubKey = crypto.createPublicKey(publicKeyPem);
            return crypto.verify(
                null,
                Buffer.from(canonical),
                pubKey,
                Buffer.from(signature, 'base64')
            );
        } catch {
            return false;
        }
    }

    public static negotiateHandshake(
        handshake: OapHandshakePayload,
        serverCapabilities: string[]
    ): OapHandshakeResponse {
        if (!handshake.supportedProtocols.includes(this.PROTOCOL_VERSION)) {
            return {
                accepted: false,
                negotiatedVersion: 'none',
                grantedCapabilities: [],
                sessionId: ''
            };
        }

        const serverCapSet = new Set(serverCapabilities);
        const granted = handshake.capabilities.filter(c => serverCapSet.has(c));

        return {
            accepted: true,
            negotiatedVersion: this.PROTOCOL_VERSION,
            grantedCapabilities: granted,
            sessionId: `sess_${crypto.randomBytes(8).toString('hex')}`
        };
    }
}
