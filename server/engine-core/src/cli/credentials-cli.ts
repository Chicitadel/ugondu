import { CredentialIntakeOrchestrator } from '../identity/credential-intake/orchestrator';
import { Logger } from '@ugondu/shared';
import { UgonduCredentialStore } from '../identity/credential-intake/store';

async function run() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (command === 'import') {
        const filePath = args[1];
        if (!filePath) {
            console.error(__t('msg_usage_ugondu_credentials_import_path_to'));
            process.exit(1);
        }

        console.log(`\nUGONDU CREDENTIAL IMPORT`);
        console.log(`────────────────────────────────────────`);
        console.log(`Input: ${filePath}`);

        try {
            const orchestrator = new CredentialIntakeOrchestrator();
            const result = await orchestrator.processImport(filePath, ['ec2', 'vpc', 'rds', 's3']);

            console.log(`Provider detected: ${result.normalized.provider.toUpperCase()}`);
            console.log(`\nAuthentication: ✓ SUCCESS`);
            console.log(`Caller: ${result.identity.principal}`);
            console.log(`Account: ${result.identity.accountId}`);

            console.log(`\nAuthorization: ✓ Ugondu capability preflight`);
            if (result.authResults._simulation_unavailable) {
                console.log('  ⚠ AUTHORIZATION SIMULATION UNAVAILABLE (Missing iam:SimulatePrincipalPolicy)');
            } else {
                for (const [cap, allowed] of Object.entries(result.authResults)) {
                    console.log(`  ${allowed ? '✓' : '✗'} ${cap}`);
                }
            }

            console.log(`\nCredential status: READY\n`);

            // Persist using Keytar
            const store = new UgonduCredentialStore();
            await store.save(result.normalized);
            console.log(`✓ Credentials stored securely in OS Keystore.`);

        } catch (error: any) {
            console.error(`\nIMPORT FAILED: ${error.message}\n`);
            process.exit(1);
        }
    } else {
        console.error(__t('unknown_credentials_command_tr'));
        process.exit(1);
    }
}

run();
