/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Engine Core / CLI / Credentials Intake
 * File           : credentials-cli.ts
 * Version        : 2.1.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-10-25
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 * - Zero String Hardcoding
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { CredentialIntakeOrchestrator } from '../identity/credential-intake/orchestrator';
import { Logger, __t } from '@ugondu/shared';
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

        console.log(__t('cli.credentials.title'));
        console.log(__t('cli.credentials.divider'));
        console.log(__t('cli.credentials.input', { filePath }));

        try {
            const orchestrator = new CredentialIntakeOrchestrator();
            const result = await orchestrator.processImport(filePath, ['ec2', 'vpc', 'rds', 's3']);

            console.log(__t('cli.credentials.provider_detected', { provider: result.normalized.provider.toUpperCase() }));
            console.log(__t('cli.credentials.auth_success'));
            console.log(__t('cli.credentials.caller', { principal: result.identity.principal }));
            console.log(__t('cli.credentials.account', { accountId: result.identity.accountId }));

            console.log(__t('cli.credentials.auth_preflight'));
            if (result.authResults._simulation_unavailable) {
                console.log(__t('cli.credentials.simulation_unavailable'));
            } else {
                for (const [cap, allowed] of Object.entries(result.authResults)) {
                    console.log(`  ${allowed ? '✓' : '✗'} ${cap}`);
                }
            }

            console.log(__t('cli.credentials.status_ready'));

            // Persist using Keytar
            const store = new UgonduCredentialStore();
            await store.save(result.normalized);
            console.log(__t('cli.credentials.stored_keystore'));

        } catch (error: any) {
            console.error(__t('cli.credentials.import_failed', { error: error.message }));
            process.exit(1);
        }
    } else {
        console.error(__t('unknown_credentials_command_tr'));
        process.exit(1);
    }
}

run();
