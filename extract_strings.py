import os
import re
import json
import string

def is_english_string(s):
    # Only consider strings that have spaces and letters
    if not isinstance(s, str) or len(s) < 5:
        return False
    if ' ' not in s:
        return False
    # Avoid sql queries, paths, URLs
    if '/' in s or 'SELECT ' in s.upper() or 'INSERT ' in s.upper():
        return False
    # Only letters, numbers, spaces, and basic punctuation
    allowed = set(string.ascii_letters + string.digits + " ,.!?'\"-()[]:")
    if any(c not in allowed for c in s):
        return False
    return True

def generate_key(s):
    # generate a key from the string, e.g. "invalid_credentials_error"
    clean = re.sub(r'[^a-zA-Z0-9]+', '_', s.lower())
    return clean.strip('_')[:30]

def process_file(filepath, locales):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception:
        return

    ext = os.path.splitext(filepath)[1]
    is_go = ext == '.go'
    is_ts = ext in ('.ts', '.tsx', '.js', '.jsx')
    
    if not (is_go or is_ts):
        return

    # find string literals (single or double quotes)
    # this simple regex might not handle escaped quotes perfectly but is a start
    string_pattern = re.compile(r'(["\'])(.*?)\1')
    
    replacements = []
    
    for match in string_pattern.finditer(content):
        quote = match.group(1)
        text = match.group(2)
        
        if is_english_string(text):
            key = generate_key(text)
            locales[key] = text
            
            original_match = match.group(0)
            if is_ts:
                replacement = f"__t('{key}')"
            else:
                replacement = f'i18n.T("{key}")'
                
            replacements.append((match.start(), match.end(), replacement))
    
    if replacements:
        # replace from back to front to preserve offsets
        new_content = content
        for start, end, repl in sorted(replacements, key=lambda x: x[0], reverse=True):
            new_content = new_content[:start] + repl + new_content[end:]
            
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)

def main():
    root_dirs = ['server', 'client']
    locales = {}
    
    for rd in root_dirs:
        for root, dirs, files in os.walk(rd):
            if 'node_modules' in dirs:
                dirs.remove('node_modules')
            if '.git' in dirs:
                dirs.remove('.git')
            for file in files:
                filepath = os.path.join(root, file)
                process_file(filepath, locales)
                
    locales_dir = os.path.join('server', 'shared', 'locales')
    os.makedirs(locales_dir, exist_ok=True)
    
    langs = ['en', 'es', 'fr', 'de', 'zh', 'ja']
    for lang in langs:
        data = locales if lang == 'en' else {k: f"[{lang}] {v}" for k, v in locales.items()}
        with open(os.path.join(locales_dir, f'{lang}.json'), 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            
if __name__ == '__main__':
    main()
