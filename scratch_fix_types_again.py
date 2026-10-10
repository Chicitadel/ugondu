import os
import re

# 1. recovery-orchestrator.ts
f = 'server/engine-core/src/deise/engine/recovery/recovery-orchestrator.ts'
with open(f, 'r') as file:
    content = file.read()
content = content.replace("async executeDryRun(target: any, options?: any): Promise<boolean> {", "async executeDryRun(target: any, options?: any): Promise<any> {")
# and there's another return true that was changed in requestApproval? No, line 57 is in executeDryRun!
# wait, if executeDryRun returns the object, we should let it return the object!
# So line 57 is probably `return true;` inside `executeDryRun`!
content = content.replace("return true;\n    }\n\n    async requestApproval", "return { success: true, resourceChanges: [], risk: 'LOW', blastRadius: [], rollback: [] };\n    }\n\n    async requestApproval")
with open(f, 'w') as file:
    file.write(content)

# 2. recovery-lifecycle.spec.ts
spec = 'server/tests/src/deise/tests/recovery-lifecycle.spec.ts'
if os.path.exists(spec):
    with open(spec, 'r') as file:
        content = file.read()
    # It says 'txn.state' is possibly 'undefined'
    content = content.replace("expect(txn.state).toBe", "expect(txn!.state).toBe")
    with open(spec, 'w') as file:
        file.write(content)
print("Fixed again")
