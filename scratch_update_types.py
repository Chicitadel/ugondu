import os
import re

file_path = "server/engine-core/src/urre/model/types.ts"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';",
    "riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN';\n    operationType?: string;"
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated types.ts")

file_path2 = "server/engine-core/src/urre/admission/preflight.ts"
if os.path.exists(file_path2):
    with open(file_path2, "r", encoding="utf-8") as f:
        content2 = f.read()

    new_block = """
    if (req.action.riskLevel === 'UNKNOWN') {
        return 'BLOCK';
    }
    const op = (req.action.operationType || '').toUpperCase();
    if (op === 'DELETE' || op === 'DROP' || op === 'OVERWRITE' || op === 'DESTROY') {
        if (!req.hasRequiredRoles) return 'BLOCK';
        if (req.action.riskLevel !== 'LOW') return 'ALLOW_WITH_APPROVAL';
    }
    """
    
    # insert inside runPreflightAdmission
    content2 = content2.replace("export function runPreflightAdmission(req: PreflightRequest): PreflightDecision {\n", "export function runPreflightAdmission(req: PreflightRequest): PreflightDecision {\n" + new_block)
    
    with open(file_path2, "w", encoding="utf-8") as f:
        f.write(content2)
    print("Updated preflight.ts")
