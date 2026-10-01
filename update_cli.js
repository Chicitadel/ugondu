const fs = require('fs');

let code = fs.readFileSync('server/engine-core/src/cli/cli.ts', 'utf8');

if (!code.includes('import { __t }')) {
  code = code.replace(/import { Command } from 'commander';/, "import { Command } from 'commander';\nimport { __t } from '@ugondu/shared';");
}

code = code.replace(/console\.log\(`Deploy execution receipt: \$\{JSON\.stringify\(receipt, null, 2\)\}`\);/, "console.log(`${__t('cli_deploy_receipt')} ${JSON.stringify(receipt, null, 2)}`);");
code = code.replace(/console\.error\('Deployment failed:', error\);/, "console.error(__t('cli_deploy_failed'), error);");

code = code.replace(/console\.log\(`Move execution receipt: \$\{JSON\.stringify\(receipt, null, 2\)\}`\);/, "console.log(`${__t('cli_move_receipt')} ${JSON.stringify(receipt, null, 2)}`);");
code = code.replace(/console\.error\('Move failed:', error\);/, "console.error(__t('cli_move_failed'), error);");

code = code.replace(/console\.log\(`Remediation execution receipt: \$\{JSON\.stringify\(receipt, null, 2\)\}`\);/, "console.log(`${__t('cli_remediation_receipt')} ${JSON.stringify(receipt, null, 2)}`);");

code = code.replace(/console\.log\(`Passport details:\\n\$\{JSON\.stringify\(passport, null, 2\)\}`\);/, "console.log(`${__t('cli_passport_details')}\\n${JSON.stringify(passport, null, 2)}`);");

code = code.replace(/console\.log\(`Emergency passport created: \$\{passport\.id\}`\);/, "console.log(`${__t('cli_emergency_created')} ${passport.id}`);");
code = code.replace(/console\.error\('Emergency creation failed:', error\);/, "console.error(__t('cli_emergency_failed'), error);");

fs.writeFileSync('server/engine-core/src/cli/cli.ts', code);
console.log('cli.ts updated');
