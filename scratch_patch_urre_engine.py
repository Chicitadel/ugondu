import os

file_path = "server/engine-core/src/urre/execution/urre-engine.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

import_statement = "import { protectedKernel } from './kernel';\n"
if "protectedKernel" not in content:
    content = content.replace("import { Logger } from '@ugondu/shared';", "import { Logger } from '@ugondu/shared';\n" + import_statement)

old_block = """                const key = `${node.provider}:${node.action}`;
                if (!this.handlers[key]) throw new Error(`No handler registered for ${key}`);

                node.output = await this.handlers[key](node);
                node.status = 'SUCCESS';
                await this.store.save(tx);"""

new_block = """                const key = `${node.provider}:${node.action}`;
                if (!this.handlers[key]) throw new Error(`No handler registered for ${key}`);

                await protectedKernel.executeAction({
                    actionId: node.id,
                    type: 'DEPLOY',
                    safetyContract: { timeoutMs: 30000, idempotent: true },
                    payload: async () => {
                        node.output = await this.handlers[key](node);
                        
                        // Independent Post-Execution Observation
                        if (typeof this.handlers[`${key}:verify`] === 'function') {
                            const verified = await this.handlers[`${key}:verify`](node);
                            if (!verified) throw new Error('INDEPENDENT_VERIFICATION_FAILED');
                        }
                    }
                } as any);

                node.status = 'SUCCESS';
                await this.store.save(tx);"""

content = content.replace(old_block, new_block)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patched urre-engine.ts")
