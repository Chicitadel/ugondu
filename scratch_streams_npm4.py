import os
import re

streams_dir = r"D:\ujomor-platform\products\ugondu\scripts\cor\streams"

for file in ['C17.js', 'C18.js', 'C19.js', 'F40.js']:
    filepath = os.path.join(streams_dir, file)
    if not os.path.exists(filepath): continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace the broken path with properly escaped one
    content = content.replace("C:\\Users\\Professional\\AppData\\Roaming\\npm\\node_modules\\npm\\bin\\npm-cli.js", "C:\\\\\\\\Users\\\\\\\\Professional\\\\\\\\AppData\\\\\\\\Roaming\\\\\\\\npm\\\\\\\\node_modules\\\\\\\\npm\\\\\\\\bin\\\\\\\\npm-cli.js")
    # Wait, the replace string in python literal:
    content = content.replace(r"C:\Users\Professional\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js", r"C:\\Users\\Professional\\AppData\\Roaming\\npm\\node_modules\\npm\\bin\\npm-cli.js")

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fixed npm spawnSync correctly 3")
