const fs = require('fs');

// executor.ts
let executorCode = fs.readFileSync('server/engine-core/src/urre/executor.ts', 'utf8');

if (!executorCode.includes('import { __t }')) {
  executorCode = executorCode.replace(/import \{ EngineInternal \} from '\.\.\/engine-internal';/, "import { EngineInternal } from '../engine-internal';\nimport { __t } from '@ugondu/shared';");
}

executorCode = executorCode.replace(/'Execution blocked: Missing valid ExecutionEnvelope'/, "__t('err_execution_blocked_no_envelope')");
executorCode = executorCode.replace(/'Execution blocked: Invalid ExecutionEnvelope signature format'/, "__t('err_execution_blocked_invalid_sig')");
executorCode = executorCode.replace(/'Execution blocked: Context ID mismatch in ExecutionEnvelope'/, "__t('err_urre_context_id_mismatch')");

fs.writeFileSync('server/engine-core/src/urre/executor.ts', executorCode);
console.log('executor.ts updated');

// sandbox.ts
let sandboxCode = fs.readFileSync('server/plugin-manager/src/sandbox.ts', 'utf8');

if (!sandboxCode.includes('import { __t }')) {
  sandboxCode = sandboxCode.replace(/import fs from 'fs';/, "import fs from 'fs';\nimport { __t } from '@ugondu/shared';");
}

sandboxCode = sandboxCode.replace(/throw new Error\(`Plugin entrypoint not found at \$\{scriptPath\}`\);/, "throw new Error(__t('err_plugin_entrypoint_not_found'));");
sandboxCode = sandboxCode.replace(/throw new Error\(`REJECT: Action \$\{step\.action\} is not in the closed typed-action registry`\);/, "throw new Error(__t('err_plugin_action_rejected'));");

fs.writeFileSync('server/plugin-manager/src/sandbox.ts', sandboxCode);
console.log('sandbox.ts updated');

