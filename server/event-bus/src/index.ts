import express, { Request, Response } from 'express';
import axios from 'axios';
import { __t, NetworkDestinationPolicy } from '@ugondu/shared';
import { eventStore } from './db';
import { Logger } from '@ugondu/shared/logger';

const app = express();
app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'event-bus', cor_level: 'A' });
});

app.post('/v1/events/publish', async (req: Request, res: Response): Promise<any> => {
    const { event, payload } = req.body;
    
    if (!event) {
        return res.status(400).json({ error: __t('event_req') });
    }

    Logger.info(__t('dispatching') + ` ${event}`);
    
    // Read from persistent datastore
    const subs = eventStore.getSubscribers(event);
    Logger.info(__t('notified', subs.length, event));

    // Real webhook dispatch
    for (const webhookUrl of subs) {
        if (!NetworkDestinationPolicy.isAllowed(webhookUrl)) {
            Logger.error(__t('delivery_failed', webhookUrl, __t('messages.error.ssrf_policy_rejection')));
            continue;
        }
        try {
            await axios.post(webhookUrl, { event, payload }, { timeout: 5000 });
            Logger.info(__t('delivered', webhookUrl));
        } catch (error: any) {
            Logger.error(__t('delivery_failed', webhookUrl, error.message));
        }
    }

    return res.status(200).json({
        dispatched: true,
        message: __t('event_success', event, subs.length)
    });
});

app.post('/v1/events/subscribe', (req: Request, res: Response): any => {
    const { event, webhookUrl } = req.body;
    
    // Write to persistent datastore
    eventStore.addSubscriber(event, webhookUrl);

    Logger.info(__t('new_sub', event, webhookUrl));
    return res.status(201).json({ message: __t('subscribed') });
});

const PORT = process.env.PORT || 4004;
app.listen(PORT, () => {
    Logger.info(__t('listening', __t('ugondu_event_bus'), PORT));
});

export * from './events/entitlement-events';
