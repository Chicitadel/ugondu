import re

doc_path = r'C:\Users\Professional\Downloads\UGONDU_COR_READY_EXACT_REMEDIATION_555D36AF_2026-10-07.md'
repo_path = r'd:\ujomor-platform\products\ugondu'

with open(doc_path, 'r', encoding='utf-8') as f:
    text = f.read()

# We look for "# 35. FULL C18 EXECUTOR"
c18_match = re.search(r'# 35\. FULL C18 EXECUTOR.*?```js\n(.*?)```', text, flags=re.DOTALL)
if c18_match:
    with open(f'{repo_path}/scripts/cor/streams/C18.js', 'w', encoding='utf-8') as f:
        f.write(c18_match.group(1).strip() + '\n')
    print("Extracted C18")

c19_match = re.search(r'# 36\. FULL C19 EXECUTOR.*?```js\n(.*?)```', text, flags=re.DOTALL)
if c19_match:
    with open(f'{repo_path}/scripts/cor/streams/C19.js', 'w', encoding='utf-8') as f:
        f.write(c19_match.group(1).strip() + '\n')
    print("Extracted C19")
    
d24_match = re.search(r'# 37\. FULL D24 EXECUTOR.*?```js\n(.*?)```', text, flags=re.DOTALL)
if d24_match:
    with open(f'{repo_path}/scripts/cor/streams/D24.js', 'w', encoding='utf-8') as f:
        f.write(d24_match.group(1).strip() + '\n')
    print("Extracted D24")
    
c17_match = re.search(r'## EXACT replacement for C17 execution\n\n```javascript\n(.*?)```', text, flags=re.DOTALL)
if not c17_match:
    c17_match = re.search(r'Replace the process invocation with:\n\n```js\n(.*?)```', text, flags=re.DOTALL)

if c17_match:
    print("Found C17 partial block")

print("Done extractor")
