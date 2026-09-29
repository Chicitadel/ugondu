import express from 'express';
import cors from 'cors';
import { randomBytes, createHmac } from 'crypto';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

const PRIVATE_SIGNING_KEY = process.env.UGONDU_PRIVATE_KEY || randomBytes(32).toString('hex');
const BILLING_GATEWAY_URL = process.env.BILLING_GATEWAY_URL || 'http://localhost:4002/v1';

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'engine-core' });
});

app.post('/v1/deploy/resolve', async (req, res): Promise<any> => {
    const { repositoryUrl, branch, fileMap, targetEnvironment, token } = req.body;
    
    if (!repositoryUrl || !branch || !targetEnvironment || !token) {
        return res.status(400).json({ error: '[en] Invalid DeploymentContext. Missing required fields or token.' });
    }

    try {
        // [en] 1. Authorize with Billing Gateway to determine Edition capabilities
        const authResponse = await axios.post(`${BILLING_GATEWAY_URL}/authorize`, { token, repositoryUrl }).catch(() => null);
        if (!authResponse || !authResponse.data.authorized) {
            return res.status(402).json({ error: '[en] Deployment blocked by Billing Gateway. License invalid or quota exceeded.' });
        }

        const { edition, capabilities } = authResponse.data;

        // [en] 2. Determine Strategy Constraints based on Edition
        let strategy = (targetEnvironment === 'cpanel' || targetEnvironment === 'directadmin') ? 'quota-sync' : 'atomic';
        
        // Community edition force-downgrades to quota-sync and denies atomic deployments
        if (!capabilities.allowAtomic && strategy === 'atomic') {
            console.log(`[en] Notice: Atomic strategy requested but denied by ${edition} license. Falling back to quota-sync.`);
            strategy = 'quota-sync';
        }
        
        const transactionId = `tx_${randomBytes(12).toString('hex')}`;
        const steps: any[] = [
            {
                action: 'FETCH_REPOSITORY',
                payload: { url: repositoryUrl, branch }
            }
        ];

        // [en] 3. Plugin Discovery and Injection
        try {
            const PLUGIN_MANAGER_URL = process.env.PLUGIN_MANAGER_URL || 'http://localhost:4003/v1';
            const pluginsResponse = await axios.get(`${PLUGIN_MANAGER_URL}/plugins`).catch(() => null);
            
            if (pluginsResponse && pluginsResponse.data && Array.isArray(pluginsResponse.data.plugins)) {
                let injectedCount = 0;
                const maxPlugins = capabilities.maxPlugins === 'unlimited' ? Infinity : (capabilities.maxPlugins || 1);

                for (const pluginName of pluginsResponse.data.plugins) {
                    if (injectedCount >= maxPlugins) {
                        console.log(`[en] Notice: Max plugins (${maxPlugins}) reached for ${edition} edition. Skipping ${pluginName}.`);
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
            console.error(`[en] Plugin execution failed:`, pluginErr);
        }

        // Add the core environment sync step after plugins
        steps.push({
            action: 'SYNC_ENVIRONMENT',
            payload: { strategy }
        });

        // [en] 4. Enforce Rollback/Retention feature flag
        if (capabilities.allowRollback) {
            steps.push({
                action: 'PRUNE_RELEASES',
                payload: { retention: 3 }
            });
        } else {
            console.log(`[en] Notice: Rollbacks and release pruning are exclusive to Professional/Enterprise editions.`);
            steps.push({
                action: 'UPSELL_NOTICE',
                payload: { message: '[en] Upgrade to Ugondu Professional to enable rollback snapshots.' }
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
        return res.status(500).json({ error: `[en] Internal Engine Error: ${err.message}` });
    }
});

app.post('/v1/telemetry/report', (req, res) => {
    const { transactionId, status, logs } = req.body;
    if (!transactionId || !status) {
        return res.status(400).json({ error: '[en] Invalid ExecutionTelemetry.' });
    }

    console.log(`[en] Telemetry Received - TX: ${transactionId} | Status: ${status}`);
    return res.status(201).json({ message: '[en] Telemetry recorded.' });
});

const PORT = process.env.PORT || 4001;
app.listen(PORT, () => {
    console.log(`[en] Ugondu Engine Core listening on port ${PORT}`);
});
