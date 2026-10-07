import os
import glob
import re

base_dir = r"D:\ujomor-platform\products\ugondu\server\uppie\src\tests\support"
fake_files = glob.glob(os.path.join(base_dir, "*.ts"))

for f_path in fake_files:
    with open(f_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace("const __t = (str: string) => str;\n", "const __t = (str: string, p?: any) => '[en] ' + str;\n")
    with open(f_path, 'w', encoding='utf-8') as f:
        f.write(content)

base_dir2 = r"D:\ujomor-platform\products\ugondu\server\uppie\src\tests"
test_files = glob.glob(os.path.join(base_dir2, "*.ts"))
for f_path in test_files:
    with open(f_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "__t" in content and "const __t =" not in content and "declare " not in content:
        content = "const __t = (str: string, p?: any) => '[en] ' + str;\n" + content
        with open(f_path, 'w', encoding='utf-8') as f:
            f.write(content)

print("Patched __t in tests to [en]")
