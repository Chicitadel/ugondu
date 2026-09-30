import { execFile } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execFileAsync = util.promisify(execFile);

const ALLOWED_ACTIONS = new Set([
    'FETCH_REPOSITORY',
    'NPM_INSTALL',
    'NPM_BUILD',
    'COMPOSER_INSTALL',
    'FILE_COPY',
    'FILE_DELETE',
    'DIRECTORY_CREATE',
    'ATOMIC_RELEASE',
    'PROCESS_START',
    'PROCESS_STOP',
    'HEALTH_CHECK',
    'SYNC_ENVIRONMENT',
    'PRUNE_RELEASES',
    'UPSELL_NOTICE'
]);

export async function executePluginSandbox(pluginPath: string, payload: any): Promise<any[]> {
    const scriptPath = path.join(pluginPath, 'index.js');
    
    if (!fs.existsSync(scriptPath)) {
        throw new Error(`Plugin entrypoint not found at ${scriptPath}`);
    }

    try {
        // [Security Fix] - Execute untrusted plugins inside a secure container sandbox
        const { stdout } = await execFileAsync('docker', [
            'run',
            '--rm',
            '--read-only',
            '--network=none',
            '--memory=128m',
            '--cpus=0.5',
            '--user=1000:1000',
            '-v', `${pluginPath}:/plugin:ro`,
            'node:20-alpine',
            'node', '/plugin/index.js', JSON.stringify(payload || {})
        ], {
            encoding: 'utf-8',
            timeout: 5000
        });

        const steps = JSON.parse(stdout);
        
        if (!Array.isArray(steps)) throw new Error('Plugin did not return an array of steps');
        
        for (const step of steps) {
            if (!ALLOWED_ACTIONS.has(step.action)) {
                throw new Error(`REJECT: Action ${step.action} is not in the closed typed-action registry`);
            }
        }
        
        return steps;
    } catch (err: any) {
        throw new Error(`Sandbox execution failed: ${err.message}`);
    }
}
