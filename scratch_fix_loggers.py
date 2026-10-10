import os
files = [
    'server/engine-core/src/deise/engine/adapters/cpanel/cpanel-live-adapter.ts',
    'server/engine-core/src/deise/engine/adapters/directadmin/directadmin-live-adapter.ts',
    'server/engine-core/src/tenant/lifecycle/deactivation.ts',
    'server/engine-core/src/tenant/lifecycle/provisioning.ts',
    'server/engine-core/src/tenant/lifecycle/quarantine.ts',
    'server/engine-core/src/tenant/lifecycle/suspension.ts',
    'server/engine-core/src/ucaas/workflow.ts'
]
import_stmt = "import { Logger } from '@ugondu/shared';\n"
for f in files:
    if os.path.exists(f):
        with open(f, 'r', encoding='utf-8') as file:
            content = file.read()
        if 'import { Logger' not in content:
            content = import_stmt + content
            with open(f, 'w', encoding='utf-8') as file:
                file.write(content)

# And fix recovery test
test_file = 'server/tests/src/deise/tests/recovery-lifecycle.spec.ts'
if os.path.exists(test_file):
    with open(test_file, 'r', encoding='utf-8') as file:
        content = file.read()
    content = content.replace("expect(txn.state).toBe", "expect(txn?.state).toBe")
    with open(test_file, 'w', encoding='utf-8') as file:
        file.write(content)
