import { Logger } from '@ugondu/shared/logger';
import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import { __t, requireServiceIdentity } from '@ugondu/shared';
import { tokenStore } from './db';

const app = express();
const allowedOrigins = [
  process.env.ENGINE_CORE_ORIGIN || 'http://localhost:3000',
  process.env.ADMIN_ORIGIN || 'https://admin.airroofers.eu',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(__t('messages.error.cors_policy_violation')), false);
  }
}));
app.use(express.json());

const IDENTITY_AUTHORITY_URL = process.env.IDENTITY_AUTHORITY_URL || 'https://identity.airroofers.eu/api/v1';

// [en] Commercial Edition Tier Definitions
const EDITIONS = {
    FREE: 'free',
    PROFESSIONAL: 'professional',
    BUSINESS: 'business',
    SOVEREIGN: 'sovereign'
};

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'billing-gateway', cor_level: 'A' });
});



app.post('/v1/authorize', requireServiceIdentity('billing-gateway'), async (req: Request, res: Response): Promise<any> => {
    const { token, repositoryUrl } = req.body;
    
    if (!token) {
        return res.status(401).json({ error: __t('auth_missing') });
    }

    try {
        Logger.info(__t('auth_validating'));

        // Zero-Stub: Verify the token securely from the SQLite DB rather than guessing by prefix
        const record = tokenStore.verifyToken(token);
        let edition = EDITIONS.FREE;
        let tenantId = 'tenant_unknown';

        if (record) {
            edition = record.edition;
            tenantId = record.tenant_id;
        } else {
            // Unregistered tokens are checked against Identity Authority
            try {
                const identityRes = await axios.post(`${IDENTITY_AUTHORITY_URL}/verify`, { token });
                tenantId = identityRes.data.tenantId || 'tenant_unknown';
                edition = identityRes.data.subscriptionTier || EDITIONS.FREE;
                
                // Cache the token so we don't hit identity server again
                tokenStore.registerToken(token, tenantId, edition);
            } catch (err) {
                // Return 402 Payment Required for invalid tokens
                throw new Error(__t('auth_rejected'));
            }
        }

        const capabilities = {
            maxPlugins: edition === EDITIONS.FREE ? 1 : (edition === EDITIONS.PROFESSIONAL ? 5 : (edition === EDITIONS.BUSINESS ? 50 : 999)),
            allowRollback: edition !== EDITIONS.FREE,
            allowAtomic: edition !== EDITIONS.FREE,
            allowTelemetry: edition === EDITIONS.SOVEREIGN || edition === EDITIONS.BUSINESS
        };
        
        Logger.info(__t('billing_verified', tenantId, edition.toUpperCase()));
        
        return res.json({
            tenantId,
            edition,
            capabilities,
            message: __t('auth_success', edition.toUpperCase())
        });
    } catch (err: any) {
        Logger.error(__t('auth_failed', err.message));
        return res.status(402).json({ error: __t('payment_required') });
    }
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => {
    Logger.info(__t('listening_port', __t('billing_gateway'), PORT));
});
