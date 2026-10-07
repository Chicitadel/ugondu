import * as fs from 'fs';
import * as path from 'path';
import { GlobalCapabilityRegistry } from '../../deise/engine/recovery/capability-registry';
import { TransactionAuthority } from '../../deise/engine/recovery/transaction-authority';

describe('COR Qualification: Model Independence & Agent Equivalence', () => {
    beforeAll(() => {
        process.env.UGONDU_UPM_SECRET = 'test_secret';

        const transactionDir = path.join(
            process.cwd(),
            '.cor-test-transactions'
        );

        process.env.UGONDU_TRANSACTION_DIR = transactionDir;
        fs.rmSync(transactionDir, { recursive: true, force: true });
        fs.mkdirSync(transactionDir, { recursive: true });
    });

    afterAll(() => {
        const transactionDir = process.env.UGONDU_TRANSACTION_DIR;
        if (transactionDir) {
            fs.rmSync(transactionDir, { recursive: true, force: true });
        }
    });

    test('requires the real production PathRepositoryReconstruction capability', () => {
        const capability =
            GlobalCapabilityRegistry.getCapability(
                'PathRepositoryReconstruction'
            );

        expect(capability).toBeDefined();

        if (!capability) {
            throw new Error(
                'COR BLOCKED: PathRepositoryReconstruction is not registered as a production capability.'
            );
        }

        expect(capability.capabilityId).toBe(
            'PathRepositoryReconstruction'
        );
    });

    test('canonicalizes CLI and AI source metadata to identical governed intent', () => {
        const common = {
            capabilityId: 'PathRepositoryReconstruction',
            target: 'localhost',
            repositoryPath: '/tmp/ugondu-test-repo',
            authorizedActions: [
                'PathRepositoryReconstruction'
            ]
        };

        const cliIntent = {
            source: 'CLI',
            ...common
        };

        const aiIntent = {
            source: 'AI_PLATFORM',
            ...common
        };

        const cliHash =
            TransactionAuthority.hashIntent(cliIntent);

        const aiHash =
            TransactionAuthority.hashIntent(aiIntent);

        expect(cliHash).toBe(aiHash);
    });
});
