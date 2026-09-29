import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const subscribers: Map<string, string[]> = new Map();

app.post('/v1/events/publish', (req: Request, res: Response): any => {
    const { event, payload } = req.body;
    
    if (!event) {
        return res.status(400).json({ error: '[en] Event name required.' });
    }

    console.log(`[en] Dispatching event: ${event}`);
    
    // In production, dispatch to Kafka/RabbitMQ here.
    // For now, simple console-based verification to prove the isolated context
    const subs = subscribers.get(event) || [];
    console.log(`[en] Notified ${subs.length} subscribers for ${event}`);

    return res.status(200).json({
        dispatched: true,
        message: `[en] Event ${event} dispatched successfully.`
    });
});

app.post('/v1/events/subscribe', (req: Request, res: Response): any => {
    const { event, webhookUrl } = req.body;
    
    const subs = subscribers.get(event) || [];
    subs.push(webhookUrl);
    subscribers.set(event, subs);

    console.log(`[en] New subscriber for event: ${event} -> ${webhookUrl}`);
    return res.status(201).json({ message: '[en] Subscribed.' });
});

const PORT = process.env.PORT || 4004;
app.listen(PORT, () => {
    console.log(`[en] Ugondu Event Bus listening on port ${PORT}`);
});
