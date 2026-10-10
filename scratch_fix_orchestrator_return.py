import os

f = 'server/engine-core/src/deise/engine/recovery/recovery-orchestrator.ts'
with open(f, 'r') as file:
    content = file.read()
content = content.replace("return { success: true, resourceChanges: [], risk: 'LOW', blastRadius: [], rollback: [] };", "return true;")
with open(f, 'w') as file:
    file.write(content)

print("Fixed")
