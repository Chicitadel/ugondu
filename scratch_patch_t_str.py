import os
import glob
import re

base_dir = r"D:\ujomor-platform\products\ugondu\server\uppie\src\tests"
ts_files = glob.glob(os.path.join(base_dir, "**", "*.ts"), recursive=True)

for f_path in ts_files:
    with open(f_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if "const __t = (str: string, p?: any) => '[en] ' + str;\n" in content:
        content = content.replace("const __t = (str: string, p?: any) => '[en] ' + str;\n", "const __t = (str: string, p?: any) => str;\n")
        with open(f_path, 'w', encoding='utf-8') as f:
            f.write(content)
    elif "const __t = (str: string) => str;\n" in content:
        content = content.replace("const __t = (str: string) => str;\n", "const __t = (str: string, p?: any) => str;\n")
        with open(f_path, 'w', encoding='utf-8') as f:
            f.write(content)

print("Patched __t back to str")
