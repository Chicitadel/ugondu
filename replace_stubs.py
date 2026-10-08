import os
import re

directories = ['server/capabilities', 'server/plugins']
patterns = [
    r'return true;',
    r'Promise\.resolve\(true\)',
    r'return false;',
    r'isValid = true'
]

# We need to replace these with: throw new Error('UNIMPLEMENTED')

def process_file(filepath):
    if 'tests/' in filepath or '.spec.' in filepath or '.test.' in filepath:
        return
        
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = content
        for p in patterns:
            # We want to replace exactly these strings.
            # Using simple string replacement might be safer if we don't care about spaces, 
            # but wait, Promise.resolve(true) is a string, but the others are statements.
            # Let's use simple string replacement since the grep matches them exactly.
            if p == r'Promise\.resolve\(true\)':
                new_content = new_content.replace('Promise.resolve(true)', "throw new Error('UNIMPLEMENTED')")
            else:
                new_content = new_content.replace(p.replace('\\', ''), "throw new Error('UNIMPLEMENTED')")
                
        if new_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated {filepath}")
    except Exception as e:
        print(f"Failed {filepath}: {e}")

for d in directories:
    if os.path.exists(d):
        for root, dirs, files in os.walk(d):
            if 'tests' in dirs:
                dirs.remove('tests')
            for file in files:
                if file.endswith('.ts') or file.endswith('.js'):
                    process_file(os.path.join(root, file))
