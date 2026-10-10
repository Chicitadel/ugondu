import os

file_path = "server/capabilities/src/capability-lifecycle/CapabilityStateMachine.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("  UNSUPPORTED:        ['AVAILABLE'],", "  UNSUPPORTED:        ['AVAILABLE'],\n  UNQUALIFIED:        ['AVAILABLE'],")
content = content.replace("AVAILABLE:          ['ACTIVE', 'PENDING_ACTIVATION', 'UNSUPPORTED']", "AVAILABLE:          ['ACTIVE', 'PENDING_ACTIVATION', 'UNSUPPORTED', 'UNQUALIFIED']")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated CapabilityStateMachine.ts")
