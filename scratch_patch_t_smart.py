import os
import glob

base_dir = r"D:\ujomor-platform\products\ugondu\server\uppie\src\tests"
ts_files = glob.glob(os.path.join(base_dir, "**", "*.ts"), recursive=True)

t_code = """const __t = (str: string, p?: any) => {
  if (['fileman', 'mysql', 'cron', 'ftpaccts', 'webmail', 'default', 'disabled', 'ugondu_taken', 'ugondu_copy', 'ugondu_everything', 'ugondu_idle'].includes(str)) return str;
  return '[en] ' + str;
};
"""

for f_path in ts_files:
    with open(f_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Remove previous injected __t
    content = content.replace("const __t = (str: string, p?: any) => '[en] ' + str;\n", "")
    content = content.replace("const __t = (str: string, p?: any) => str;\n", "")
    content = content.replace("const __t = (str: string) => str;\n", "")
    
    if "__t" in content and "const __t =" not in content and "declare " not in content:
        content = t_code + content
        with open(f_path, 'w', encoding='utf-8') as f:
            f.write(content)

print("Patched __t with smart logic")
