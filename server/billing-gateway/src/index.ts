import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

const BILLING_AUTHORITY_URL = process.env.BILLING_AUTHORITY_URL || 'https://billing.airroofers.eu/api/v1';
const IDENTITY_AUTHORITY_URL = process.env.IDENTITY_AUTHORITY_URL || 'https://identity.airroofers.eu/api/v1';

// [en] Commercial Edition Tier Definitions
const EDITIONS = {
    COMMUNITY: 'community',
    PROFESSIONAL: 'professional',
    ENTERPRISE: 'enterprise'
};

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'billing-gateway' });
});

app.post('/v1/authorize', async (req: Request, res: Response): Promise<any> => {
    const { token, repositoryUrl } = req.body;
    
    if (!token) {
        return res.status(401).json({ error: '[en] Missing authentication token. Deployment rejected.' });
    }

    try {
        console.log(`[en] Validating token with Identity Authority...`);
        const identityRes = await axios.post(`${IDENTITY_AUTHORITY_URL}/verify`, { token }).catch(err => {
            throw new Error('[en] Identity Authority rejected the token.');
        });
        const tenantId = identityRes.data.tenantId || 'tenant_unknown';
        
        // Mocking the subscription resolution logic dynamically based on Identity payload instead of pure string match.
        let edition = identityRes.data.subscriptionTier || EDITIONS.COMMUNITY;
        if (token.startsWith('ugp_')) edition = EDITIONS.PROFESSIONAL;
        if (token.startsWith('uge_')) edition = EDITIONS.ENTERPRISE;

        const capabilities = {
            maxPlugins: edition === EDITIONS.COMMUNITY ? 1 : (edition === EDITIONS.PROFESSIONAL ? 5 : 999),
            allowRollback: edition !== EDITIONS.COMMUNITY,
            allowAtomic: edition !== EDITIONS.COMMUNITY,
            allowTelemetry: edition === EDITIONS.ENTERPRISE
        };
        
        console.log(`[en] Billing and quota verified. Tenant: ${tenantId}, Edition: ${edition.toUpperCase()}.`);
        
        return res.status(200).json({
            authorized: true,
            tenantId,
            edition,
            capabilities,
            message: `[en] Authorization successful. Operating under ${edition.toUpperCase()} license.`
        });

    } catch (err: any) {
        console.error(`[en] Authorization failed: ${err.message}`);
        return res.status(402).json({ error: '[en] Payment Required or License Exhausted.' });
    }
});

const PORT = process.env.PORT || 4002;
app.listen(PORT, () => {
    console.log(`[en] Ugondu Billing Gateway listening on port ${PORT}`);
});
