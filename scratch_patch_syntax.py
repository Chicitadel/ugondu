import os
file_path = "server/engine-core/src/registry/action-registry.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("{\n                {\n                    id: 'container:registry:create',", "{\n                    id: 'container:registry:create',")
content = content.replace("{\n\t\t\t\t{\n\t\t\t\t\tid: 'container:registry:create',", "{\n\t\t\t\t\tid: 'container:registry:create',")
content = content.replace("            {\n                {\n                    id: 'container:registry:create',", "            {\n                    id: 'container:registry:create',")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patched action-registry.ts syntax error")
