import express from 'express';
import cors from 'cors';
import { randomBytes, createHmac } from 'crypto';
import axios from 'axios';
import { __t } from '@ugondu/shared';

const app = express();
app.use(cors());
app.use(express.json());

const PRIVATE_SIGNING_KEY = process.env.UGONDU_PRIVATE_KEY || randomBytes(32).toString('hex');
const BILLING_GATEWAY_URL = process.env.BILLING_GATEWAY_URL || 'http://localhost:4002/v1';

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'engine-core', cor_level: 'A' });
});

app.post('/v1/deploy/resolve', async (req, res): Promise<any> => {
    const { repositoryUrl, branch, fileMap, targetEnvironment, token } = req.body;
    
    if (!repositoryUrl || !branch || !targetEnvironment || !token) {
        return res.status(400).json({ error: __t('invalid_ctx') });
    }

    try {
        const authResponse = await axios.post(`${BILLING_GATEWAY_URL}/authorize`, { token, repositoryUrl }).catch(() => null);
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
            const pluginsResponse = await axios.get(`${PLUGIN_MANAGER_URL}/plugins`).catch(() => null);
            
            if (pluginsResponse && pluginsResponse.data && Array.isArray(pluginsResponse.data.plugins)) {
                let injectedCount = 0;
                const maxPlugins = capabilities.maxPlugins === 'unlimited' ? Infinity : (capabilities.maxPlugins || 1);

                for (const pluginName of pluginsResponse.data.plugins) {
                    if (injectedCount >= maxPlugins) {
                        console.log(__t('max_plugins', maxPlugins, edition, pluginName));
                        break;
                    }

                    const execResponse = await axios.post(`${PLUGIN_MANAGER_URL}/plugins/${pluginName}/execute`, { payload: {} }).catch(() => null);
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

        const recipePayload = JSON.stringify({ transactionId, strategy, steps, edition });
        const signature = createHmac('sha256', PRIVATE_SIGNING_KEY).update(recipePayload).digest('hex');

        return res.status(200).json({
            transactionId,
            edition,
            strategy,
            steps,
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
