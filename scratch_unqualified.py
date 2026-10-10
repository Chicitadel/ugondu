import os

file_path = "server/engine-core/src/registry/action-registry.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

unqualified_actions = [
    'compute:instance:create',
    'database:relational:create',
    'storage:object:put',
    'network:vpc:create',
    'container:registry:create',
    'container:image:build',
    'container:image:push',
    'container:task-definition:create',
    'container:service:create',
    'ugondu:deploy',
    'network:security-group:create'
]

# The file contains action definitions like:
# id: 'compute:instance:create',
# description: 'Create Compute Instance',
# We just replace the description if the id matches.

for action in unqualified_actions:
    # Find the block for this action
    idx = content.find(f"id: '{action}'")
    if idx != -1:
        desc_idx = content.find("description: '", idx)
        if desc_idx != -1:
            end_quote = content.find("'", desc_idx + 14)
            original_desc = content[desc_idx + 14:end_quote]
            if not original_desc.startswith("[UNQUALIFIED]"):
                content = content[:desc_idx + 14] + "[UNQUALIFIED] " + content[desc_idx + 14:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Marked UNQUALIFIED in action-registry.ts")
