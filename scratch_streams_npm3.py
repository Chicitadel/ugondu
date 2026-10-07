import os
import re

streams_dir = r"D:\ujomor-platform\products\ugondu\scripts\cor\streams"
npm_cli_path = r"C:\Users\Professional\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js"

for file in ['C17.js', 'C18.js', 'C19.js', 'F40.js']:
    filepath = os.path.join(streams_dir, file)
    if not os.path.exists(filepath): continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Search for any string starting with C:\UsersProfessional
    content = re.sub(r"'C:[^']*?'", f"'{npm_cli_path.replace(chr(92), chr(92)+chr(92))}'", content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fixed npm spawnSync correctly 2")
