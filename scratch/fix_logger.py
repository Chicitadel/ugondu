import os
import re

def fix_imports(dir_path):
    for root, dirs, files in os.walk(dir_path):
        for file in files:
            if file.endswith('.ts'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Replace logger imports
                pattern = r"import\s+\{\s*Logger\s*\}\s+from\s+['\"](?:\.\.\/)+shared\/logger(?:.*?)\w*['\"];?"
                new_content = re.sub(pattern, "import { Logger } from '@ugondu/shared';", content)
                
                if new_content != content:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.write(new_content)
                    print(f"Fixed {path}")

fix_imports('server/engine-core/src')
