/******************************************************************************
 * Project        : Ugondu
 * Module         : Server / Engine Core
 * File           : ip-blocklist.ts
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

import * as net from 'net';

export function isPrivateOrLocal(ip: string): boolean {
    if (net.isIPv4(ip)) {
        const parts = ip.split('.').map(Number);
        if (parts.length !== 4) return false;
        
        // 127.0.0.0/8 (loopback)
        if (parts[0] === 127) return true;
        // 10.0.0.0/8 (RFC 1918)
        if (parts[0] === 10) return true;
        // 172.16.0.0/12 (RFC 1918)
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
        // 192.168.0.0/16 (RFC 1918)
        if (parts[0] === 192 && parts[1] === 168) return true;
        // 169.254.0.0/16 (link-local)
        if (parts[0] === 169 && parts[1] === 254) return true;
        // 100.64.0.0/10 (CGNAT)
        if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
        // 0.0.0.0 and 255.255.255.255 (broadcast/unspecified)
        if ((parts[0] === 0 && parts[1] === 0 && parts[2] === 0 && parts[3] === 0) ||
            (parts[0] === 255 && parts[1] === 255 && parts[2] === 255 && parts[3] === 255)) {
            return true;
        }
        
        return false;
    } else if (net.isIPv6(ip)) {
        const lowerIp = ip.toLowerCase();
        
        if (lowerIp.startsWith('::ffff:')) {
            const ipv4Part = lowerIp.substring(7);
            if (ipv4Part.includes('.')) {
                return isPrivateOrLocal(ipv4Part);
            }
        }
        
        if (lowerIp === '::1' || lowerIp === '::') return true;

        const expanded = expandIPv6(lowerIp);
        if (expanded.startsWith('fc') || expanded.startsWith('fd')) return true;
        if (expanded.startsWith('fe8') || expanded.startsWith('fe9') || expanded.startsWith('fea') || expanded.startsWith('feb')) return true;
        
        return false;
    }
    
    return false;
}

function expandIPv6(ip: string): string {
    const parts = ip.split('::');
    if (parts.length === 1) {
        return ip.split(':').map(p => p.padStart(4, '0')).join(':');
    }
    const left = parts[0] ? parts[0].split(':') : [];
    const right = parts[1] ? parts[1].split(':') : [];
    const missing = 8 - (left.length + right.length);
    const middle = Array(missing).fill('0000');
    return [...left, ...middle, ...right].map(p => p.padStart(4, '0')).join(':');
}
