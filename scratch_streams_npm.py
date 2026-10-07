import os
import re

streams_dir = r"D:\ujomor-platform\products\ugondu\scripts\cor\streams"
npm_cli_path = r"C:\Users\Professional\AppData\Roaming\npm\node_modules\npm\bin\npm-cli.js".replace('\\', '\\\\')

for file in ['C17.js', 'C18.js', 'C19.js', 'F40.js']:
    filepath = os.path.join(streams_dir, file)
    if not os.path.exists(filepath): continue
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace spawnSync( 'npm.cmd' ... ) with spawnSync( process.execPath, [npm_cli_path, ...] )
    content = re.sub(
        r"spawnSync\(\s*(?:process\.platform === 'win32' \? 'npm\.cmd' : 'npm'|npmCommand),\s*\[(.*?)\]",
        f"spawnSync(process.execPath, ['{npm_cli_path}', \\1]",
        content,
        flags=re.DOTALL
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Fixed npm spawnSync")
