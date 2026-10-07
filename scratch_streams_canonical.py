import os
import re

streams_dir = r"D:\ujomor-platform\products\ugondu\scripts\cor\streams"

for file in os.listdir(streams_dir):
    if not file.endswith('.js'): continue
    
    filepath = os.path.join(streams_dir, file)
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Add canonicalize require if not present
    if "require('canonicalize')" not in content:
        content = content.replace("const crypto = require('crypto');", "const crypto = require('crypto');\nconst canonicalizeModule = require('canonicalize');\nconst canonicalize = canonicalizeModule.default || canonicalizeModule;")
    
    # Update evidenceDigest computation
    if "JSON.stringify(receipt)" in content:
        content = content.replace("JSON.stringify(receipt)", "canonicalize(receipt)")
    elif "JSON.stringify(" in content and "receipt" in content:
        # Regex replacement for multi-line JSON.stringify(receipt)
        content = re.sub(r"JSON\.stringify\(\s*receipt\s*\)", "canonicalize(receipt)", content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

print("Injected canonicalize into all streams.")
