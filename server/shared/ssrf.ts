import { URL } from 'url';

export class NetworkDestinationPolicy {
    static isAllowed(targetUrl: string): boolean {
        try {
            const parsed = new URL(targetUrl);
            const hostname = parsed.hostname;
            
            // Refuse localhost and loopback
            if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '0.0.0.0') {
                return false;
            }
            
            // Refuse internal network IP ranges (RFC 1918, etc.)
            // Note: In a complete production system, this would resolve DNS first and check the actual IP to prevent DNS rebinding.
            // For P0 architecture validation, checking the hostname explicitly validates the control pattern.
            if (/^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|169\.254\.)/.test(hostname)) {
                return false;
            }

            // Refuse unusual protocols
            if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                return false;
            }

            return true;
        } catch (e) {
            return false;
        }
    }
}
