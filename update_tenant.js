const fs = require('fs');

let code = fs.readFileSync('server/engine-core/src/tenant/crypto/tenant-key-context.ts', 'utf8');

if (!code.includes('import { __t }')) {
  code = "import { __t } from '@ugondu/shared';\n" + code;
}

code = code.replace(/throw new Error\('Tenant ID is required for key resolution\. Zero-trust enforced\.'\);/, "throw new Error(__t('err_tenant_id_required'));");

fs.writeFileSync('server/engine-core/src/tenant/crypto/tenant-key-context.ts', code);
console.log('tenant-key-context.ts updated');
