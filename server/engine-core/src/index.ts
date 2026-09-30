import express from 'express';
import cors from 'cors';
import { randomBytes, generateKeyPairSync, sign } from 'crypto';
import axios from 'axios';
import { __t, signServiceIdentity } from '@ugondu/shared';
import canonicalize from 'canonicalize';

const app = express();
const allowedOrigins = [
    'https://admin.airroofers.eu',
    'https://governance.airroofers.eu',
    'https://license.airroofers.eu'
];
app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            return callback(new Error('CORS policy violation'), false);
        }
        return callback(null, true);
    }
}));
app.use(express.json());

// ED25519 Keypair generation (in production, load from secure vault)
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const keyId = 'key_' + randomBytes(8).toString('hex');
const BILLING_GATEWAY_URL = process.env.BILLING_GATEWAY_URL || 'http://localhost:4002/v1';

app.get('/v1/keys', (req, res) => {
    res.json({ keys: [{ id: keyId, type: 'ed25519', publicKey: publicKey.export({ type: 'spki', format: 'pem' }) }] });
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'engine-core', cor_level: 'A' });
});

app.post('/v1/deploy/resolve', async (req, res): Promise<any> => {
    const { repositoryUrl, branch, fileMap, targetEnvironment, token } = req.body;
    
    if (!repositoryUrl || !branch || !targetEnvironment || !token) {
        return res.status(400).json({ error: __t('invalid_ctx') });
    }

    try {
        const bgAuth = signServiceIdentity('engine-core', 'billing-gateway');
        const authResponse = await axios.post(`${BILLING_GATEWAY_URL}/authorize`, { token, repositoryUrl }, { headers: { Authorization: `Bearer ${bgAuth}` } }).catch(() => null);
        if (!authResponse || !authResponse.data || !authResponse.data.edition) {
            return res.status(402).json({ error: __t('blocked') });
        }

        const { edition, capabilities } = authResponse.data;

        let strategy = (targetEnvironment === 'cpanel' || targetEnvironment === 'directadmin') ? 'quota-sync' : 'atomic';
        
        if (!capabilities.allowAtomic && strategy === 'atomic') {
            console.log(__t('atomic_denied', edition));
            strategy = 'quota-sync';
        }
        
        const transactionId = `tx_${randomBytes(12).toString('hex')}`;
        const steps: any[] = [
            {
                action: 'FETCH_REPOSITORY',
                payload: { url: repositoryUrl, branch }
            }
        ];

        try {
            const PLUGIN_MANAGER_URL = process.env.PLUGIN_MANAGER_URL || 'http://localhost:4003/v1';
            const pmAuth = signServiceIdentity('engine-core', 'plugin-manager');
            const pluginsResponse = await axios.get(`${PLUGIN_MANAGER_URL}/plugins`, { headers: { Authorization: `Bearer ${pmAuth}` } }).catch(() => null);
            
            if (pluginsResponse && pluginsResponse.data && Array.isArray(pluginsResponse.data.plugins)) {
                let injectedCount = 0;
                const maxPlugins = capabilities.maxPlugins === 'unlimited' ? Infinity : (capabilities.maxPlugins || 1);

                for (const pluginName of pluginsResponse.data.plugins) {
                    if (injectedCount >= maxPlugins) {
                        console.log(__t('max_plugins', maxPlugins, edition, pluginName));
                        break;
                    }

                    const execResponse = await axios.post(`${PLUGIN_MANAGER_URL}/plugins/${pluginName}/execute`, { payload: {}, tenantId: authResponse.data.tenantId }, { headers: { Authorization: `Bearer ${pmAuth}` } }).catch(() => null);
                    if (execResponse && execResponse.data && Array.isArray(execResponse.data.injectedSteps)) {
                        steps.push(...execResponse.data.injectedSteps);
                        injectedCount++;
                    }
                }
            }
        } catch (pluginErr) {
            console.error(__t('plugin_failed'), pluginErr);
        }

        steps.push({
            action: 'SYNC_ENVIRONMENT',
            payload: { strategy }
        });

        if (capabilities.allowRollback) {
            steps.push({
                action: 'PRUNE_RELEASES',
                payload: { retention: 3 }
            });
        } else {
            console.log(__t('rollback_denied'));
            steps.push({
                action: 'UPSELL_NOTICE',
                payload: { message: __t('upsell_notice') }
            });
        }

        const canonicalSteps = canonicalize(steps) || '[]';
        const planHash = require('crypto').createHash('sha256').update(canonicalSteps).digest('hex');

        const envelope = {
            version: '1.0',
            issuer: 'ugondu-engine',
            keyId: keyId,
            transactionId,
            tenantId: authResponse.data.tenantId || 'tenant_unknown',
            projectId: 'default',
            environmentId: targetEnvironment,
            issuedAt: Date.now(),
            expiresAt: Date.now() + 1000 * 60 * 5, // 5 mins expiry
            edition,
            planHash,
            capabilities,
            policyHash: 'default-policy',
            agentMinVersion: '1.0.0'
        };

        const canonicalEnvelope = canonicalize(envelope) || '{}';
        const signature = sign(null, Buffer.from(canonicalEnvelope), privateKey).toString('base64');

        return res.status(200).json({
            canonicalEnvelope,
            canonicalSteps,
            signature
        });

    } catch (err: any) {
        return res.status(500).json({ error: __t('internal_err', err.message) });
    }
});

app.post('/v1/telemetry/report', (req, res) => {
    const { transactionId, status, logs } = req.body;
    if (!transactionId || !status) {
        return res.status(400).json({ error: __t('invalid_telemetry') });
    }

    console.log(__t('telemetry_rec', transactionId, status));
    return res.status(201).json({ message: __t('telemetry_saved') });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
    console.log(__t('listening', 'Ugondu Engine Core', PORT));
});
