/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Qualification / COR S3 Tag Verification Negative Suite (F-24)
 * File           : cor-s3-tag-negative.test.js
 * Version        : 2.0.0
 * Author         : Enterprise Architecture Council / Ujomor Systems Engineering Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-25
 * Last Modified  : 2026-10-25
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Corporate Policy Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS / NIST SP 800-53
 *
 * Remediation Proof for Finding F-24:
 * 1. AccessDenied from S3 client throws fail-closed error (CorTagVerificationAccessDeniedError)
 * 2. NoSuchTagSet results in missing tag assertion failure (CorTagVerificationError)
 * 3. Missing UgonduCOR tag fails closed
 * 4. Missing UgonduTransactionId fails closed
 * 5. Wrong transaction/run ID fails closed
 * 6. Timeout or HTTP 500 fails closed
 * 7. Genuine provider SDK response with valid tags passes
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

function loadCorContract() {
    try {
        return require('../../server/engine-core/dist/assurance/cor-cleanup-contract');
    } catch {
        const ts = require('typescript');
        const tsPath = path.resolve(__dirname, '../../server/engine-core/src/assurance/cor-cleanup-contract.ts');
        const src = fs.readFileSync(tsPath, 'utf8');
        const transpiled = ts.transpileModule(src, {
            compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
        });
        const m = { exports: {} };
        const fn = new Function('require', 'module', 'exports', '__filename', '__dirname', transpiled.outputText);
        fn(require, m, m.exports, tsPath, path.dirname(tsPath));
        return m.exports;
    }
}

const {
    CorTagVerificationAccessDeniedError,
    CorTagVerificationError,
    verifyS3BucketTags
} = loadCorContract();

test('F-24 Negative Proof: AccessDenied from S3 client throws fail-closed CorTagVerificationAccessDeniedError', async () => {
    const bucketName = 'ugondu-test-bucket-access-denied-001';
    const txId = 'tx-test-f24-001';

    const mockS3Client = {
        send: async () => {
            const err = new Error('Access Denied to GetBucketTagging');
            err.name = 'AccessDenied';
            err.Code = 'AccessDenied';
            err.$metadata = { httpStatusCode: 403 };
            throw err;
        }
    };

    await assert.rejects(
        async () => {
            await verifyS3BucketTags(mockS3Client, bucketName, txId);
        },
        (err) => {
            assert.ok(
                err instanceof CorTagVerificationAccessDeniedError,
                `Expected CorTagVerificationAccessDeniedError, got ${err.name}`
            );
            assert.strictEqual(err.name, 'CorTagVerificationAccessDeniedError');
            assert.strictEqual(err.bucketName, bucketName);
            assert.ok(err.message.includes('AccessDenied'), 'Error message must reflect AccessDenied');
            return true;
        }
    );
});

test('F-24 Negative Proof: NoSuchTagSet results in missing tag assertion failure', async () => {
    const bucketName = 'ugondu-test-bucket-no-tags-002';
    const txId = 'tx-test-f24-002';

    const mockS3Client = {
        send: async () => {
            const err = new Error('There is no tag set associated with the bucket.');
            err.name = 'NoSuchTagSet';
            err.Code = 'NoSuchTagSet';
            err.$metadata = { httpStatusCode: 404 };
            throw err;
        }
    };

    await assert.rejects(
        async () => {
            await verifyS3BucketTags(mockS3Client, bucketName, txId);
        },
        (err) => {
            assert.ok(
                err instanceof CorTagVerificationError,
                `Expected CorTagVerificationError, got ${err.name}`
            );
            assert.strictEqual(err.name, 'CorTagVerificationError');
            assert.strictEqual(err.bucketName, bucketName);
            assert.ok(Array.isArray(err.missingTags), 'missingTags must be an array');
            assert.ok(err.missingTags.includes('UgonduCOR=true'), 'Must flag missing UgonduCOR');
            assert.ok(err.missingTags.some(t => t.includes('UgonduTransactionId')), 'Must flag missing UgonduTransactionId');
            return true;
        }
    );
});

test('F-24 Negative Proof: Missing UgonduCOR tag fails closed', async () => {
    const bucketName = 'ugondu-test-bucket-missing-cor-003';
    const txId = 'tx-test-f24-003';

    const mockS3Client = {
        send: async () => ({
            TagSet: [
                { Key: 'UgonduTransactionId', Value: txId },
                { Key: 'Environment', Value: 'production' }
            ]
        })
    };

    await assert.rejects(
        async () => {
            await verifyS3BucketTags(mockS3Client, bucketName, txId);
        },
        (err) => {
            assert.ok(err instanceof CorTagVerificationError);
            assert.ok(err.missingTags.includes('UgonduCOR=true'), 'Must detect missing UgonduCOR');
            return true;
        }
    );
});

test('F-24 Negative Proof: Missing UgonduTransactionId fails closed', async () => {
    const bucketName = 'ugondu-test-bucket-missing-tx-004';
    const txId = 'tx-test-f24-004';

    const mockS3Client = {
        send: async () => ({
            TagSet: [
                { Key: 'UgonduCOR', Value: 'true' }
            ]
        })
    };

    await assert.rejects(
        async () => {
            await verifyS3BucketTags(mockS3Client, bucketName, txId);
        },
        (err) => {
            assert.ok(err instanceof CorTagVerificationError);
            assert.ok(err.missingTags.some(t => t.includes(`UgonduTransactionId=${txId}`)), 'Must detect missing UgonduTransactionId');
            return true;
        }
    );
});

test('F-24 Negative Proof: Wrong transaction or run ID fails closed', async () => {
    const bucketName = 'ugondu-test-bucket-wrong-tx-005';
    const expectedTxId = 'tx-test-f24-expected-005';
    const wrongTxId = 'tx-test-f24-tampered-005';
    const expectedRunId = 'run-expected-005';
    const wrongRunId = 'run-different-005';

    // Sub-case A: Wrong transaction ID
    const mockS3WrongTx = {
        send: async () => ({
            TagSet: [
                { Key: 'UgonduCOR', Value: 'true' },
                { Key: 'UgonduTransactionId', Value: wrongTxId }
            ]
        })
    };

    await assert.rejects(
        async () => {
            await verifyS3BucketTags(mockS3WrongTx, bucketName, expectedTxId);
        },
        (err) => {
            assert.ok(err instanceof CorTagVerificationError);
            assert.ok(err.missingTags.some(t => t.includes(expectedTxId)), 'Must fail on mismatched transaction ID');
            return true;
        }
    );

    // Sub-case B: Wrong run ID when expectedRunId is required
    const mockS3WrongRun = {
        send: async () => ({
            TagSet: [
                { Key: 'UgonduCOR', Value: 'true' },
                { Key: 'UgonduTransactionId', Value: expectedTxId },
                { Key: 'UgonduRunId', Value: wrongRunId }
            ]
        })
    };

    await assert.rejects(
        async () => {
            await verifyS3BucketTags(mockS3WrongRun, bucketName, expectedTxId, { expectedRunId });
        },
        (err) => {
            assert.ok(err instanceof CorTagVerificationError);
            assert.ok(err.missingTags.some(t => t.includes(expectedRunId)), 'Must fail on mismatched run ID');
            return true;
        }
    );
});

test('F-24 Negative Proof: Timeout or HTTP 500 fails closed with typed error', async () => {
    const bucketName = 'ugondu-test-bucket-network-fault-006';
    const txId = 'tx-test-f24-006';

    // Sub-case A: Network timeout
    const mockS3Timeout = {
        send: async () => {
            const err = new Error('Socket timeout connecting to s3.amazonaws.com');
            err.name = 'TimeoutError';
            err.code = 'ETIMEDOUT';
            throw err;
        }
    };

    await assert.rejects(
        async () => {
            await verifyS3BucketTags(mockS3Timeout, bucketName, txId);
        },
        (err) => {
            assert.ok(err instanceof CorTagVerificationError);
            assert.ok(err.message.includes('Failed to fetch tags for bucket') || err.message.includes('Provider error'));
            return true;
        }
    );

    // Sub-case B: Internal Server Error (HTTP 500)
    const mockS3Http500 = {
        send: async () => {
            const err = new Error('Internal Server Error');
            err.name = 'InternalError';
            err.$metadata = { httpStatusCode: 500 };
            throw err;
        }
    };

    await assert.rejects(
        async () => {
            await verifyS3BucketTags(mockS3Http500, bucketName, txId);
        },
        (err) => {
            assert.ok(err instanceof CorTagVerificationError);
            assert.ok(err.message.includes('Failed to fetch tags for bucket') || err.message.includes('Provider error'));
            return true;
        }
    );
});

test('F-24 Positive Proof: Genuine provider SDK response with valid tags passes', async () => {
    const bucketName = 'ugondu-test-bucket-valid-007';
    const txId = 'tx-test-f24-valid-007';
    const runId = 'run-test-f24-valid-007';
    const owner = 'ugondu-cor';

    const authenticTagSet = [
        { Key: 'UgonduCOR', Value: 'true' },
        { Key: 'UgonduTransactionId', Value: txId },
        { Key: 'UgonduRunId', Value: runId },
        { Key: 'UgonduOwner', Value: owner },
        { Key: 'UgonduCandidateSha', Value: '40e9ba48c5b162540d99ef87b6131c19d424b946' }
    ];

    const mockS3ValidClient = {
        send: async (cmd) => {
            assert.strictEqual(cmd.input.Bucket, bucketName);
            return {
                $metadata: { httpStatusCode: 200 },
                TagSet: authenticTagSet
            };
        }
    };

    const result = await verifyS3BucketTags(mockS3ValidClient, bucketName, txId, {
        expectedRunId: runId,
        expectedOwner: owner
    });

    assert.strictEqual(result.verified, true);
    assert.deepStrictEqual(result.tagSet, authenticTagSet);
});
