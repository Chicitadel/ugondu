import sys

files = [
    'server/plugin-manager/src/index.ts',
    'server/repository-adapter/src/index.ts',
    'server/billing-gateway/src/index.ts'
]

for file in files:
    try:
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
            
        content = content.replace('console.error', 'Logger.error')
        content = content.replace('console.log', 'Logger.info')
        content = content.replace('console.warn', 'Logger.warn')
        
        if 'import { Logger }' not in content:
            content = "import { Logger } from '@ugondu/shared/logger';\n" + content
            
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Fixed {file}')
    except Exception as e:
        print(f'Failed {file}: {e}')
