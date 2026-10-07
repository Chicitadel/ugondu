import os
import glob

base_dir = r"D:\ujomor-platform\products\ugondu\scripts\cor\streams"
e34_file = glob.glob(os.path.join(base_dir, "E34*.js"))[0]

with open(e34_file, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const OBJECTIVE = 'Verify client locale packs are present, parseable, schema-complete, and integrated with the client localization loader';", "const OBJECTIVE = 'Verify client/locales obsolete directory is absent';")

with open(e34_file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched E34 objective")
