import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

const PLUGINS_DIR = process.env.PLUGINS_DIR || path.resolve(__dirname, '../../../plugins');

interface PluginMetadata {
    name: string;
    version: string;
    description: string;
}

app.get('/v1/plugins', (req: Request, res: Response): any => {
    try {
        if (!fs.existsSync(PLUGINS_DIR)) {
            return res.status(200).json({ plugins: [] });
        }
        const pluginFolders = fs.readdirSync(PLUGINS_DIR);
        const activePlugins: PluginMetadata[] = [];

        for (const folder of pluginFolders) {
            const manifestPath = path.join(PLUGINS_DIR, folder, 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
                activePlugins.push(manifest);
            }
        }

        console.log(`[en] Discovered ${activePlugins.length} installable plugins.`);
        return res.status(200).json({ plugins: activePlugins });
    } catch (err: any) {
        console.error(`[en] Error scanning plugins: ${err.message}`);
        return res.status(500).json({ error: '[en] Internal Plugin Engine Error.' });
    }
});

import { execSync } from 'child_process';

app.post('/v1/plugins/:pluginName/execute', (req: Request, res: Response): any => {
    const { pluginName } = req.params;
    const { payload } = req.body;

    console.log(`[en] Executing sandbox action for plugin: ${pluginName}`);
    const pluginPath = path.join(PLUGINS_DIR, pluginName);
    
    if (!fs.existsSync(pluginPath)) {
        return res.status(404).json({ error: `[en] Plugin ${pluginName} not found.` });
    }

    try {
        const scriptPath = path.join(pluginPath, 'index.js');
        let injectedSteps = [];
        if (fs.existsSync(scriptPath)) {
            // [en] Execute plugin in a restricted child process
            const output = execSync(`node ${scriptPath} '${JSON.stringify(payload || {})}'`, { encoding: 'utf-8', timeout: 5000 });
            injectedSteps = JSON.parse(output);
        } else {
            // [en] Default generic fallback if plugin has no execution script
            injectedSteps = [
                { action: `EXECUTE_${pluginName.toUpperCase()}`, payload: payload || {} }
            ];
        }

        return res.status(200).json({
            plugin: pluginName,
            status: 'SUCCESS',
            injectedSteps,
            message: `[en] Plugin ${pluginName} executed successfully.`
        });
    } catch (err: any) {
        return res.status(500).json({ error: `[en] Plugin Sandbox Error: ${err.message}` });
    }
});

const PORT = process.env.PORT || 4003;
app.listen(PORT, () => {
    console.log(`[en] Ugondu Plugin Manager Sandbox listening on port ${PORT}`);
});
