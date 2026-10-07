import os
import re

streams_dir = r"D:\ujomor-platform\products\ugondu\scripts\cor\streams"

for file in os.listdir(streams_dir):
    if not file.endswith('.js'): continue
    
    filepath = os.path.join(streams_dir, file)
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if "module.exports" not in content:
        content += "\nmodule.exports = {\n    metadata,\n    run\n};\n"
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

print("Restored module.exports")
