import os

file = r"D:\ujomor-platform\products\ugondu\scripts\cor\streams\F40-Independent-Passport-Binding.js"

if not os.path.exists(file):
    import glob
    file = glob.glob(r"D:\ujomor-platform\products\ugondu\scripts\cor\streams\F40*.js")[0]

with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const OBJECTIVE = 'Verify final independent passport certification bindings';", "const OBJECTIVE = 'Verify final independent passport certification';")

with open(file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched F40 objective")
