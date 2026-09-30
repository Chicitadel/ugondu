import express, { Request, Response } from 'express';
import axios from 'axios';
import { __t, requireServiceIdentity } from '@ugondu/shared';
import { tokenStore } from './db';

const app = express();
app.use(express.json());

const IDENTITY_AUTHORITY_URL = process.env.IDENTITY_AUTHORITY_URL || 'https://identity.airroofers.eu/api/v1';

// [en] Commercial Edition Tier Definitions
const EDITIONS = {
    COMMUNITY: 'community',
    PROFESSIONAL: 'professional',
    ENTERPRISE: 'enterprise'
};

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'billing-gateway', cor_level: 'A' });
});

if (process.env.NODE_ENV === 'test') {
    tokenStore.registerToken('ugp_demo123', 'tenant_prof_99', EDITIONS.PROFESSIONAL);
    tokenStore.registerToken('uge_corp456', 'tenant_ent_11', EDITIONS.ENTERPRISE);
}

app.post('/v1/authorize', requireServiceIdentity('billing-gateway'), async (req: Request, res: Response): Promise<any> => {
    const { token, repositoryUrl } = req.body;
    
    if (!token) {
        return res.status(401).json({ error: __t('auth_missing') });
    }

    try {
        console.log(__t('auth_validating'));

        // Zero-Stub: Verify the token securely from the SQLite DB rather than guessing by prefix
        const record = tokenStore.verifyToken(token);
        let edition = EDITIONS.COMMUNITY;
        let tenantId = 'tenant_unknown';

        if (record) {
            edition = record.edition;
            tenantId = record.tenant_id;
        } else {
            // Unregistered tokens are checked against Identity Authority
            try {
                const identityRes = await axios.post(`${IDENTITY_AUTHORITY_URL}/verify`, { token });
                tenantId = identityRes.data.tenantId || 'tenant_unknown';
                edition = identityRes.data.subscriptionTier || EDITIONS.COMMUNITY;
                
                // Cache the token so we don't hit identity server again
                tokenStore.registerToken(token, tenantId, edition);
            } catch (err) {
                // Return 402 Payment Required for invalid tokens
                throw new Error(__t('auth_rejected'));
            }
        }

        const capabilities = {
            maxPlugins: edition === EDITIONS.COMMUNITY ? 1 : (edition === EDITIONS.PROFESSIONAL ? 5 : 999),
            allowRollback: edition !== EDITIONS.COMMUNITY,
            allowAtomic: edition !== EDITIONS.COMMUNITY,
            allowTelemetry: edition === EDITIONS.ENTERPRISE
        };
        
        console.log(__t('billing_verified', tenantId, edition.toUpperCase()));
        
        return res.json({
            tenantId,
            edition,
            capabilities,
            message: __t('auth_success', edition.toUpperCase())
        });
    } catch (err: any) {
        console.error(__t('auth_failed', err.message));
        return res.status(402).json({ error: __t('payment_required') });
    }
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => {
    console.log(__t('listening_port', 'Billing Gateway', PORT));
});
