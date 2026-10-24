/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Security & SSRF Protection
 * File           : ssrf.ts
 * Version        : 2.1.0
 * Author         : Server & Cryptography Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
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
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

import { URL } from 'url';
import * as dns from 'dns';
import * as net from 'net';
import * as http from 'http';
import * as https from 'https';
import { __t } from './i18n';

export class NetworkDestinationPolicy {
    static isDisallowedIPv4(ip: string): boolean {
        const parts = ip.split('.').map(p => Number(p));
        if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
            return false;
        }
        const [b0, b1, b2] = parts;

        if (b0 === 0) return true;
        if (b0 === 10) return true;
        if (b0 === 100 && b1 >= 64 && b1 <= 127) return true; // CGNAT
        if (b0 === 127) return true;
        if (b0 === 169 && b1 === 254) return true; // Cloud Metadata
        if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
        if (b0 === 192 && b1 === 0 && b2 === 0) return true;
        if (b0 === 192 && b1 === 0 && b2 === 2) return true;
        if (b0 === 192 && b1 === 168) return true;
        if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;
        if (b0 === 198 && b1 === 51 && b2 === 100) return true;
        if (b0 === 203 && b1 === 0 && b2 === 113) return true;
        if (b0 >= 224) return true;

        return false;
    }

    static parseIPv6(ip: string): number[] | null {
        let addr = ip.toLowerCase().trim();
        if (addr.startsWith('[') && addr.endsWith(']')) {
            addr = addr.slice(1, -1);
        }
        const zoneIndex = addr.indexOf('%');
        if (zoneIndex !== -1) addr = addr.substring(0, zoneIndex);

        if (addr.includes('.')) {
            const lastColon = addr.lastIndexOf(':');
            if (lastColon === -1) return null;
            const v4Part = addr.substring(lastColon + 1);
            const v4Octets = v4Part.split('.').map(p => Number(p));
            if (v4Octets.length !== 4 || v4Octets.some(p => isNaN(p) || p < 0 || p > 255)) return null;
            const high = ((v4Octets[0] << 8) | v4Octets[1]).toString(16);
            const low = ((v4Octets[2] << 8) | v4Octets[3]).toString(16);
            addr = addr.substring(0, lastColon + 1) + high + ':' + low;
        }

        const doubleColon = addr.indexOf('::');
        let parts: string[];
        if (doubleColon !== -1) {
            if (addr.indexOf('::', doubleColon + 1) !== -1) return null;
            const prefix = addr.substring(0, doubleColon).split(':').filter(p => p.length > 0);
            const suffix = addr.substring(doubleColon + 2).split(':').filter(p => p.length > 0);
            const fillCount = 8 - (prefix.length + suffix.length);
            if (fillCount < 0) return null;
            parts = [...prefix, ...Array(fillCount).fill('0'), ...suffix];
        } else {
            parts = addr.split(':');
        }

        if (parts.length !== 8) return null;
        const blocks: number[] = [];
        for (const part of parts) {
            if (!/^[0-9a-f]{1,4}$/i.test(part)) return null;
            const val = parseInt(part, 16);
            if (isNaN(val) || val < 0 || val > 0xffff) return null;
            blocks.push(val);
        }
        return blocks;
    }

    static isDisallowedIPv6(ip: string): boolean {
        const blocks = NetworkDestinationPolicy.parseIPv6(ip);
        if (!blocks) return false;

        if (blocks.every(b => b === 0)) return true;
        if (blocks.slice(0, 7).every(b => b === 0) && blocks[7] === 1) return true;
        if ((blocks[0] & 0xffc0) === 0xfe80) return true;
        if ((blocks[0] & 0xfe00) === 0xfc00) return true; // ULA including fd00::/8
        if (blocks.slice(0, 5).every(b => b === 0) && blocks[5] === 0xffff) { // IPv4-mapped
            const b0 = (blocks[6] >> 8) & 0xff;
            const b1 = blocks[6] & 0xff;
            const b2 = (blocks[7] >> 8) & 0xff;
            const b3 = blocks[7] & 0xff;
            return NetworkDestinationPolicy.isDisallowedIPv4(`${b0}.${b1}.${b2}.${b3}`);
        }
        if (blocks.slice(0, 6).every(b => b === 0)) { // IPv4-compatible
            const b0 = (blocks[6] >> 8) & 0xff;
            const b1 = blocks[6] & 0xff;
            const b2 = (blocks[7] >> 8) & 0xff;
            const b3 = blocks[7] & 0xff;
            return NetworkDestinationPolicy.isDisallowedIPv4(`${b0}.${b1}.${b2}.${b3}`);
        }
        if ((blocks[0] & 0xff00) === 0xff00) return true;
        if ((blocks[0] & 0xffc0) === 0xfec0) return true;
        if (blocks[0] === 0x0100 && blocks.slice(1, 4).every(b => b === 0)) return true;
        if (blocks[0] === 0x2001 && blocks[1] === 0x0db8) return true;

        return false;
    }

    static isDisallowedIP(ip: string): boolean {
        let clean = ip.trim();
        if (clean.startsWith('[') && clean.endsWith(']')) clean = clean.slice(1, -1);
        if (/^\d{1,3}(\.\d{1,3}){3}$/.test(clean)) return NetworkDestinationPolicy.isDisallowedIPv4(clean);
        return NetworkDestinationPolicy.isDisallowedIPv6(clean);
    }

    static isAllowed(targetUrl: string): boolean {
        try {
            const parsed = new URL(targetUrl);
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
            let hostname = parsed.hostname.toLowerCase();
            if (hostname.startsWith('[') && hostname.endsWith(']')) hostname = hostname.slice(1, -1);
            if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '0.0.0.0') return false;
            if (/^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.|127\.|0\.)/.test(hostname)) return false;
            if (NetworkDestinationPolicy.isDisallowedIP(hostname)) return false;
            return true;
        } catch {
            return false;
        }
    }

    static async isAllowedAsync(targetUrl: string): Promise<boolean> {
        if (!NetworkDestinationPolicy.isAllowed(targetUrl)) return false;
        try {
            const parsed = new URL(targetUrl);
            let hostname = parsed.hostname.toLowerCase();
            if (hostname.startsWith('[') && hostname.endsWith(']')) hostname = hostname.slice(1, -1);
            if (net.isIP(hostname)) return !NetworkDestinationPolicy.isDisallowedIP(hostname);
            const records = await dns.promises.lookup(hostname, { all: true });
            if (!records || records.length === 0) return false;
            for (const record of records) {
                if (NetworkDestinationPolicy.isDisallowedIP(record.address)) return false;
            }
            return true;
        } catch {
            return false;
        }
    }
}

export function validateDestination(targetUrl: string): boolean {
    if (!NetworkDestinationPolicy.isAllowed(targetUrl)) {
        throw new Error(__t('messages.error.ssrf_destination_prohibited'));
    }
    return true;
}

export async function safeFetch(url: string, options: any = {}): Promise<any> {
    const isAllowed = await NetworkDestinationPolicy.isAllowedAsync(url);
    if (!isAllowed) throw new Error(__t('error_ssrf_detected'));

    const parsed = new URL(url);
    
    // Connection IP pinning with TLS/SNI hostname verification preservation
    const records = await dns.promises.lookup(parsed.hostname, { all: true });
    if (!records || records.length === 0) throw new Error(__t('error_dns_resolution_failed'));
    
    // Filter out disallowed IPs to be safe, even though we just checked above
    const safeRecords = records.filter(r => !NetworkDestinationPolicy.isDisallowedIP(r.address));
    if (safeRecords.length === 0) throw new Error(__t('error_ssrf_detected'));

    const targetIp = safeRecords[0].address;

    return new Promise((resolve, reject) => {
        const reqOptions: http.RequestOptions | https.RequestOptions = {
            hostname: targetIp, // Pin IP
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: options.method || 'GET',
            headers: {
                ...options.headers,
                'Host': parsed.hostname // Preserve original Host/SNI
            }
        };

        if (parsed.protocol === 'https:') {
            (reqOptions as https.RequestOptions).servername = parsed.hostname; // SNI preservation
        }

        const client = parsed.protocol === 'https:' ? https : http;
        const req = client.request(reqOptions, (res) => {
            // Redirect target revalidation
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                let redirectUrl = res.headers.location;
                if (!redirectUrl.startsWith('http')) {
                    redirectUrl = new URL(redirectUrl, url).toString();
                }
                resolve(safeFetch(redirectUrl, options));
                return;
            }

            const MAX_BYTES = 10 * 1024 * 1024; // 10MB limit
            let data = '';
            res.on('error', reject);
            res.on('data', (chunk) => { 
                data += chunk; 
                if (data.length > MAX_BYTES) {
                    req.destroy();
                    reject(new Error(__t('response_size_exceeded_limit')));
                }
            });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data
                });
            });
        });

        req.on('error', (e) => reject(e));
        if (options.body) req.write(options.body);
        req.end();
    });
}
