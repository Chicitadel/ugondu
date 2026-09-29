import express, { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import { __t } from '@ugondu/shared';

const app = express();
app.use(cors());
app.use(express.json());

const subscribers: Map<string, string[]> = new Map();

app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'event-bus' });
});

app.post('/v1/events/publish', async (req: Request, res: Response): Promise<any> => {
    const { event, payload } = req.body;
    
    if (!event) {
        return res.status(400).json({ error: __t('event_req') });
    }

    console.log(__t('dispatching') + ` ${event}`);
    
    const subs = subscribers.get(event) || [];
    console.log(__t('notified', subs.length, event));

    // Real webhook dispatch
    for (const webhookUrl of subs) {
        try {
            await axios.post(webhookUrl, { event, payload }, { timeout: 5000 });
            console.log(__t('delivered', webhookUrl));
        } catch (error: any) {
            console.error(__t('delivery_failed', webhookUrl, error.message));
        }
    }

    return res.status(200).json({
        dispatched: true,
        message: __t('event_success', event, subs.length)
    });
});

app.post('/v1/events/subscribe', (req: Request, res: Response): any => {
    const { event, webhookUrl } = req.body;
    
    const subs = subscribers.get(event) || [];
    subs.push(webhookUrl);
    subscribers.set(event, subs);

    console.log(__t('new_sub', event, webhookUrl));
    return res.status(201).json({ message: __t('subscribed') });
});

const PORT = process.env.PORT || 4004;
app.listen(PORT, () => {
    console.log(__t('listening', 'Ugondu Event Bus', PORT));
});
