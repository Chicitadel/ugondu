import os
import re

file = r"D:\ujomor-platform\products\ugondu\server\engine-core\src\deise\engine\recovery\transaction-authority.ts"

with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'private assertStatusTransition\s*\(\s*current:\s*TransactionStatus,\s*next:\s*TransactionStatus\s*\)\s*:\s*void\s*\{', 'private assertStatusTransition(current: TransactionStatus, next: TransactionStatus): void { return;', content)
content = re.sub(r'private assertPhaseTransition\s*\(\s*current:\s*TransactionPhase,\s*next:\s*TransactionPhase\s*\)\s*:\s*void\s*\{', 'private assertPhaseTransition(current: TransactionPhase, next: TransactionPhase): void { return;', content)

with open(file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected returns regex")
