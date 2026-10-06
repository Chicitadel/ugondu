import os
import re
import json
import string

def is_english_string(s):
    if not isinstance(s, str) or len(s) < 5:
        return False
    if ' ' not in s:
        return False
    # Avoid sql queries, paths, URLs, logging formatting, regexes
    if '/' in s or 'SELECT ' in s.upper() or 'INSERT ' in s.upper() or 'UPDATE ' in s.upper():
        return False
    if '%' in s or '\\' in s or '<' in s or '>' in s or '{' in s or '}' in s:
        return False
    # Only letters, numbers, spaces, and basic punctuation
    allowed = set(string.ascii_letters + string.digits + " ,.!?'\"-():")
    if any(c not in allowed for c in s):
        return False
    # Avoid entirely uppercase with underscores
    if s.isupper() and '_' in s:
        return False
    # Avoid strings without spaces but with camelcase
    if ' ' not in s and any(c.isupper() for c in s[1:]):
        return False
    return True

def generate_key(s):
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

    # To avoid matching already localized strings, skip files that just define localization
    if 'locales' in filepath or 'i18n' in filepath:
        return

    string_pattern = re.compile(r'(["\'])(.*?)\1')
    replacements = []
    
    for match in string_pattern.finditer(content):
        quote = match.group(1)
        text = match.group(2)
        
        # Don't replace if it's already inside a localization call!
        # Check context around match
        start = match.start()
        context_before = content[max(0, start-15):start]
        if '__t(' in context_before or 'i18n.T(' in context_before or 'T(' in context_before:
            continue
            
        if is_english_string(text):
            key = generate_key(text)
            locales[key] = text
            
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
    root_dirs = ['server', 'client', 'api', 'config']
    locales_dir = os.path.join('client', 'locales')
    
    # Load existing locales
    en_file = os.path.join(locales_dir, 'en.json')
    if os.path.exists(en_file):
        with open(en_file, 'r', encoding='utf-8') as f:
            locales = json.load(f)
    else:
        locales = {}
    
    for rd in root_dirs:
        for root, dirs, files in os.walk(rd):
            if 'node_modules' in dirs:
                dirs.remove('node_modules')
            if '.git' in dirs:
                dirs.remove('.git')
            if 'locales' in dirs:
                dirs.remove('locales')
            for file in files:
                filepath = os.path.join(root, file)
                process_file(filepath, locales)
                
    # Save back to en.json
    with open(en_file, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(locales, f, indent=2, ensure_ascii=False)
        f.write('\n')
        
    print(f"Extracted strings to {en_file}. Total keys: {len(locales)}")

if __name__ == '__main__':
    main()
