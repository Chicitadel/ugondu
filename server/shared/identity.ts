import { randomBytes, createHmac } from 'crypto';

// In a real enterprise system this would be asymmetric (JWKS) or mTLS.
// For P0 architecture validation, this symmetric identity binding fulfills the control requirement.
const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || 'static-dev-key';

export function signServiceIdentity(issuer: string, audience: string): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ iss: issuer, aud: audience, exp: Date.now() + 60000 })).toString('base64url');
    const signature = createHmac('sha256', INTERNAL_SERVICE_KEY).update(`${header}.${payload}`).digest('base64url');
    return `${header}.${payload}.${signature}`;
}

export function requireServiceIdentity(expectedAudience: string) {
    return (req: any, res: any, next: any) => {
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing service identity token' });
        }
        
        try {
            const token = auth.substring(7);
            const [header, payload, signature] = token.split('.');
            const expectedSig = createHmac('sha256', INTERNAL_SERVICE_KEY).update(`${header}.${payload}`).digest('base64url');
            
            if (signature !== expectedSig) {
                return res.status(401).json({ error: 'Invalid service identity signature' });
            }
            
            const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
            if (decodedPayload.aud !== expectedAudience) {
                return res.status(403).json({ error: `Audience mismatch. Expected ${expectedAudience}` });
            }
            
            if (Date.now() > decodedPayload.exp) {
                return res.status(401).json({ error: 'Service identity token expired' });
            }
            
            (req as any).serviceIdentity = decodedPayload;
            next();
        } catch (err) {
            return res.status(401).json({ error: 'Malformed service identity token' });
        }
    };
}
