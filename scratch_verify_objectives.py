import os
import json
import glob

manifest_path = r"D:\ujomor-platform\products\ugondu\.governance\cor\ugondu-cor-qualification-manifest.json"
streams_dir = r"D:\ujomor-platform\products\ugondu\scripts\cor\streams"

with open(manifest_path, 'r', encoding='utf-8') as f:
    manifest = json.load(f)

for item in manifest.get('items', []):
    stream_id = item['id']
    expected_obj = item['objective']
    
    stream_files = glob.glob(os.path.join(streams_dir, f"{stream_id}*.js"))
    if not stream_files:
        print(f"Missing {stream_id}")
        continue
    
    stream_file = stream_files[0]
    with open(stream_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple extraction
    if f"const OBJECTIVE = '{expected_obj}';" not in content:
        # Patch it automatically!
        print(f"Patching {stream_id} to {expected_obj}")
        import re
        content = re.sub(r"const OBJECTIVE = '.*?';", f"const OBJECTIVE = '{expected_obj}';", content)
        with open(stream_file, 'w', encoding='utf-8') as f:
            f.write(content)

print("All objectives matched/patched!")
