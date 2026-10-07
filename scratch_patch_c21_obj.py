import os

file = r"D:\ujomor-platform\products\ugondu\scripts\cor\streams\C21.js"

with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const OBJECTIVE = 'Verify Dockerfile immutability and security constraints'; // Update to match your actual objective if different", "const OBJECTIVE = 'Verify Fargate deployment container identity structure';")

with open(file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched C21 objective")
