/******************************************************************************
 * Project        : Ugondu
 * Module         : Server / Engine Core
 * File           : hardened-client.ts
 * Version        : 2.0.0
 * Author         : Server & Cryptography Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : GOVERNMENT | ENTERPRISE | PUBLIC | INTERNAL
 *
 * Governance:
 * - Corporate Governed
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
 * Copyright (c) 2026 Air Roofers Ltd
 * All Rights Reserved.
 ******************************************************************************/

import * as http from 'http';
import * as https from 'https';
import { promises as dns } from 'dns';
import { URL } from 'url';
import { isPrivateOrLocal } from './ip-blocklist';
import { __t } from '@ugondu/shared';

/**
 * @class SSRFBlockedError
 * @description Corporate Governed class implementation for SSRFBlockedError
 * @classification ENTERPRISE
 */
export class SSRFBlockedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SSRFBlockedError';
    }
}

/**
 * @interface RequestInit
 * @description Corporate Governed interface implementation for RequestInit
 * @classification ENTERPRISE
 */
export interface RequestInit {
    headers?: Record<string, string>;
    timeout?: number;
}

async function request(method: string, urlStr: string, body?: unknown, options?: RequestInit, redirects = 0): Promise<string> {
    if (redirects > 3) {
        throw new Error(__t('messages.error.too_many_redirects'));
    }

    const parsedUrl = new URL(urlStr);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error(__t('err_invalid_protocol') || __t('invalid_protocol'));
    }

    const hostname = parsedUrl.hostname;

    // DNS Lookup
    let resolvedIp: string;
    try {
        const lookupResult = await dns.lookup(hostname);
        resolvedIp = lookupResult.address;
    } catch (err: any) {
        throw new Error(__t('messages.error.dns_lookup_failed_for', { 'hostname': hostname, 'err_message': err.message }));
    }

    if (isPrivateOrLocal(resolvedIp)) {
        throw new SSRFBlockedError(__t('err_ssrf_blocked') || __t('ssrf_blocked'));
    }

    const requestOptions: http.RequestOptions = {
        hostname: resolvedIp,
        port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: method,
        headers: {
            'Host': hostname,
            ...(options?.headers || {})
        },
        timeout: options?.timeout || 5000
    };

    const client = parsedUrl.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
        const req = client.request(requestOptions, (res) => {
            if (res.statusCode && [301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
                const newUrl = new URL(res.headers.location, urlStr).toString();
                resolve(request(method, newUrl, body, options, redirects + 1));
                return;
            }

            if (res.statusCode && res.statusCode >= 400) {
                reject(new Error(`Request failed with status code ${res.statusCode}`));
                return;
            }

            const MAX_BYTES = 10 * 1024 * 1024; // 10MB limit
            let responseData = '';
            res.on('error', reject);
            res.on('data', (chunk) => {
                responseData += chunk;
                if (responseData.length > MAX_BYTES) {
                    req.destroy();
                    reject(new Error('Response size exceeded limit'));
                }
            });
            res.on('end', () => {
                resolve(responseData);
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(__t('request_timeout')));
        });

        if (body) {
            const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
            const hdrs = requestOptions.headers as Record<string, string | string[] | number | undefined> | undefined;
            if (!hdrs?.['Content-Type'] && typeof body !== 'string') {
                req.setHeader('Content-Type', 'application/json');
            }
            req.write(bodyStr);
        }

        req.end();
    });
}

export async function hardenedGet(url: string, options?: RequestInit): Promise<string> {
    return request('GET', url, undefined, options);
}

export async function hardenedPost(url: string, body: unknown, options?: RequestInit): Promise<string> {
    return request('POST', url, body, options);
}
