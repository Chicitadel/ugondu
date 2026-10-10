import os

file_path = "server/capabilities/src/capability-registry/CapabilityDefinition.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("  | 'UNSUPPORTED';", "  | 'UNSUPPORTED'\n  | 'UNQUALIFIED';")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Added UNQUALIFIED to CapabilityState")
