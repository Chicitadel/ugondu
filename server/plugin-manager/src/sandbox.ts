import { execFile } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execFileAsync = util.promisify(execFile);

export async function executePluginSandbox(pluginPath: string, payload: any): Promise<any[]> {
    const scriptPath = path.join(pluginPath, 'index.js');
    
    if (fs.existsSync(scriptPath)) {
        // [Zero-Stub / Security Fix] - Execute securely bypassing shell interpolation
        const { stdout } = await execFileAsync('node', [scriptPath, JSON.stringify(payload || {})], {
            encoding: 'utf-8',
            timeout: 5000
        });
        return JSON.parse(stdout);
    } else {
        const pluginName = path.basename(pluginPath);
        return [
            { action: `EXECUTE_${pluginName.toUpperCase()}`, payload: payload || {} }
        ];
    }
}
