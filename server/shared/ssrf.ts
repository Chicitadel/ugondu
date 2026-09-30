/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Security & SSRF Protection
 * File           : ssrf.ts
 * Version        : 2.0.0
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

export class NetworkDestinationPolicy {
    /**
     * Evaluates whether an IPv4 address falls within private, loopback,
     * link-local, broadcast, multicast, or reserved ranges.
     */
    static isDisallowedIPv4(ip: string): boolean {
        const parts = ip.split('.').map(p => Number(p));
        if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
            return false;
        }
        const [b0, b1, b2] = parts;

        // 0.0.0.0/8 (Current network / default route)
        if (b0 === 0) return true;

        // 10.0.0.0/8 (RFC 1918 Private-Use)
        if (b0 === 10) return true;

        // 100.64.0.0/10 (Shared Address Space / CGNAT)
        if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

        // 127.0.0.0/8 (Loopback)
        if (b0 === 127) return true;

        // 169.254.0.0/16 (Link-Local / Cloud Metadata)
        if (b0 === 169 && b1 === 254) return true;

        // 172.16.0.0/12 (RFC 1918 Private-Use: 172.16.0.0 – 172.31.255.255)
        if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

        // 192.0.0.0/24 (IETF Protocol Assignments)
        if (b0 === 192 && b1 === 0 && b2 === 0) return true;

        // 192.0.2.0/24 (TEST-NET-1)
        if (b0 === 192 && b1 === 0 && b2 === 2) return true;

        // 192.168.0.0/16 (RFC 1918 Private-Use)
        if (b0 === 192 && b1 === 168) return true;

        // 198.18.0.0/15 (Network Interconnect Device Benchmark)
        if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;

        // 198.51.100.0/24 (TEST-NET-2)
        if (b0 === 198 && b1 === 51 && b2 === 100) return true;

        // 203.0.113.0/24 (TEST-NET-3)
        if (b0 === 203 && b1 === 0 && b2 === 113) return true;

        // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved) & 255.255.255.255 (Broadcast)
        if (b0 >= 224) return true;

        return false;
    }

    /**
     * Parses an IPv6 address string into an array of 8 16-bit integers.
     */
    static parseIPv6(ip: string): number[] | null {
        let addr = ip.toLowerCase().trim();
        if (addr.startsWith('[') && addr.endsWith(']')) {
            addr = addr.slice(1, -1);
        }

        // Strip zone index (e.g. fe80::1%eth0)
        const zoneIndex = addr.indexOf('%');
        if (zoneIndex !== -1) {
            addr = addr.substring(0, zoneIndex);
        }

        // Handle IPv4-mapped or IPv4-compatible IPv6 (e.g. ::ffff:192.168.1.1)
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

    /**
     * Evaluates whether an IPv6 address falls within loopback, link-local,
     * unique local (ULA), IPv4-mapped/compatible private, or multicast ranges.
     */
    static isDisallowedIPv6(ip: string): boolean {
        const blocks = NetworkDestinationPolicy.parseIPv6(ip);
        if (!blocks) return false;

        // Unspecified :: (0:0:0:0:0:0:0:0)
        if (blocks.every(b => b === 0)) return true;

        // Loopback ::1 (0:0:0:0:0:0:0:1)
        if (blocks.slice(0, 7).every(b => b === 0) && blocks[7] === 1) return true;

        // Link-Local: fe80::/10 (fe80:: to febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff)
        if ((blocks[0] & 0xffc0) === 0xfe80) return true;

        // Unique Local Address (ULA): fc00::/7 (fc00:: to fdff:ffff:ffff:ffff:ffff:ffff:ffff)
        if ((blocks[0] & 0xfe00) === 0xfc00) return true;

        // IPv4-mapped IPv6 (::ffff:0:0/96 or ::ffff:a.b.c.d)
        if (blocks.slice(0, 5).every(b => b === 0) && blocks[5] === 0xffff) {
            const b0 = (blocks[6] >> 8) & 0xff;
            const b1 = blocks[6] & 0xff;
            const b2 = (blocks[7] >> 8) & 0xff;
            const b3 = blocks[7] & 0xff;
            return NetworkDestinationPolicy.isDisallowedIPv4(`${b0}.${b1}.${b2}.${b3}`);
        }

        // IPv4-compatible IPv6 (::a.b.c.d)
        if (blocks.slice(0, 6).every(b => b === 0)) {
            const b0 = (blocks[6] >> 8) & 0xff;
            const b1 = blocks[6] & 0xff;
            const b2 = (blocks[7] >> 8) & 0xff;
            const b3 = blocks[7] & 0xff;
            return NetworkDestinationPolicy.isDisallowedIPv4(`${b0}.${b1}.${b2}.${b3}`);
        }

        // Multicast: ff00::/8
        if ((blocks[0] & 0xff00) === 0xff00) return true;

        // Site-Local: fec0::/10 (RFC 3879 deprecated)
        if ((blocks[0] & 0xffc0) === 0xfec0) return true;

        // Discard Prefix: 100::/64 (RFC 6666)
        if (blocks[0] === 0x0100 && blocks.slice(1, 4).every(b => b === 0)) return true;

        // Documentation: 2001:db8::/32
        if (blocks[0] === 0x2001 && blocks[1] === 0x0db8) return true;

        return false;
    }

    /**
     * Determines whether an IP address (IPv4 or IPv6) is disallowed.
     */
    static isDisallowedIP(ip: string): boolean {
        let clean = ip.trim();
        if (clean.startsWith('[') && clean.endsWith(']')) {
            clean = clean.slice(1, -1);
        }
        if (/^\d{1,3}(\.\d{1,3}){3}$/.test(clean)) {
            return NetworkDestinationPolicy.isDisallowedIPv4(clean);
        }
        return NetworkDestinationPolicy.isDisallowedIPv6(clean);
    }

    /**
     * Synchronous policy check inspecting URL protocol, syntax, and hostname literal.
     */
    static isAllowed(targetUrl: string): boolean {
        try {
            const parsed = new URL(targetUrl);

            // Refuse non-HTTP/HTTPS protocols
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                return false;
            }

            let hostname = parsed.hostname.toLowerCase();
            if (hostname.startsWith('[') && hostname.endsWith(']')) {
                hostname = hostname.slice(1, -1);
            }

            // Refuse localhost and local domain aliases
            if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '0.0.0.0') {
                return false;
            }

            // Refuse internal network IP prefixes
            if (/^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.|127\.|0\.)/.test(hostname)) {
                return false;
            }

            // Check if hostname is directly a disallowed IP
            if (NetworkDestinationPolicy.isDisallowedIP(hostname)) {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    }

    /**
     * Asynchronous policy check performing full DNS resolution using dns.promises.lookup
     * with { all: true } to prevent DNS rebinding and inspect all resolved IPv4/IPv6 addresses.
     */
    static async isAllowedAsync(targetUrl: string): Promise<boolean> {
        // Run synchronous syntax and protocol validation first
        if (!NetworkDestinationPolicy.isAllowed(targetUrl)) {
            return false;
        }

        try {
            const parsed = new URL(targetUrl);
            let hostname = parsed.hostname.toLowerCase();
            if (hostname.startsWith('[') && hostname.endsWith(']')) {
                hostname = hostname.slice(1, -1);
            }

            // If hostname is already an IP address, synchronous check is sufficient
            if (net.isIP(hostname)) {
                return !NetworkDestinationPolicy.isDisallowedIP(hostname);
            }

            // Perform comprehensive DNS lookup checking all resolved records
            const records = await dns.promises.lookup(hostname, { all: true });
            if (!records || records.length === 0) {
                return false;
            }

            for (const record of records) {
                if (NetworkDestinationPolicy.isDisallowedIP(record.address)) {
                    return false;
                }
            }

            return true;
        } catch {
            // DNS resolution failure or network lookup error aborts authorization
            return false;
        }
    }
}
