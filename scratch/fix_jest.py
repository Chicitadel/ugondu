import sys
import os
import re

def replace_in_file(path, old, new):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    if old in content or re.search(old, content):
        content = re.sub(old, new, content)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {path}")
    else:
        print(f"Not found in {path}")

# Fix rollback.spec.ts i18n
replace_in_file('server/engine-core/src/urre/tests/rollback.spec.ts', 
                r"import \{ __t \} from '\.\./\.\./\.\./shared/i18n';", 
                r"import { __t } from '@ugondu/shared';")

# Fix intent.qualification.spec.ts CapabilityEvaluation
replace_in_file('server/engine-core/src/intent/tests/intent.qualification.spec.ts', 
                r"import \{ CapabilityEvaluation \} from '\.\./\.\./fabric/contract/CapabilityEvaluation';", 
                r"// removed missing CapabilityEvaluation import")

# Fix aws.ts networkRefId
replace_in_file('server/engine-core/src/fabric/providers/aws.ts', 
                r"config.networkRefId", 
                r"config.networkId")

# Fix registry.ts i18n
replace_in_file('server/engine-core/src/fabric/registry.ts', 
                r"import \{ __t \} from '\.\./\.\./\.\./\.\./shared/i18n';", 
                r"import { __t } from '@ugondu/shared';")

