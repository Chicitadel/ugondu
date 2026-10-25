/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Qualification / COR VPC Cleanup Hardening Suite (F-23)
 * File           : cor-cleanup-hardening.test.js
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
 * Remediation Proof for Finding F-23:
 * 1. Provider describe error (AccessDenied/timeout) halts cleanup and throws CorCleanupExecutionError
 * 2. Unowned VPC (missing UgonduOwner=ugondu-cor or required tags) is never deleted
 * 3. Active lease (leaseExpiresAt in future or active runId) is never deleted
 * 4. Stale expired VPC with matching ownership tags is cleanly deleted (SGs, Subnets, VPC)
 * 5. Delete failure halts and reports residual resource ID
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
    CorCleanupExecutionError,
    CorVpcDependencyTimeoutError,
    CorResourceManifest,
    cleanupOwnedCorVpcs
} = loadCorContract();

test('F-23 Hardened VPC Cleanup: Provider describe error halts cleanup and throws CorCleanupExecutionError', async () => {
    const activeRunId = 'run-active-001';

    // Sub-case A: DescribeVpcsCommand fails with AccessDenied
    const mockEc2DescribeVpcsDenied = {
        send: async (cmd) => {
            if (cmd.constructor.name === 'DescribeVpcsCommand' || cmd.input?.Filters) {
                const err = new Error('User is not authorized to perform ec2:DescribeVpcs');
                err.name = 'AccessDenied';
                err.$metadata = { httpStatusCode: 403 };
                throw err;
            }
            throw new Error('Unexpected command');
        }
    };

    await assert.rejects(
        async () => {
            await cleanupOwnedCorVpcs(mockEc2DescribeVpcsDenied, activeRunId);
        },
        (err) => {
            assert.ok(err instanceof CorCleanupExecutionError, `Expected CorCleanupExecutionError, got ${err.name}`);
            assert.strictEqual(err.operation, 'DescribeVpcs');
            assert.ok(err.message.includes('DescribeVpcs'));
            return true;
        }
    );

    // Sub-case B: DescribeSecurityGroupsCommand fails with timeout
    const mockEc2DescribeSgsTimeout = {
        send: async (cmd) => {
            const cmdName = cmd.constructor.name;
            if (cmdName === 'DescribeVpcsCommand' || cmd.input?.Filters?.[0]?.Name === 'tag:UgonduOwner') {
                return {
                    Vpcs: [{
                        VpcId: 'vpc-stale-002',
                        Tags: [
                            { Key: 'UgonduOwner', Value: 'ugondu-cor' },
                            { Key: 'UgonduRunId', Value: 'run-expired-002' },
                            { Key: 'UgonduLeaseExpiresAt', Value: new Date(Date.now() - 60000).toISOString() }
                        ]
                    }]
                };
            }
            if (cmdName === 'DescribeSecurityGroupsCommand' || cmd.input?.Filters?.[0]?.Name === 'vpc-id') {
                const err = new Error('Connection timeout while describing security groups');
                err.name = 'TimeoutError';
                throw err;
            }
            throw new Error(`Unexpected command: ${cmdName}`);
        }
    };

    await assert.rejects(
        async () => {
            await cleanupOwnedCorVpcs(mockEc2DescribeSgsTimeout, activeRunId);
        },
        (err) => {
            assert.ok(err instanceof CorCleanupExecutionError, `Expected CorCleanupExecutionError, got ${err.name}`);
            assert.ok(err instanceof CorVpcDependencyTimeoutError, `Expected CorVpcDependencyTimeoutError, got ${err.name}`);
            assert.strictEqual(err.name, 'CorVpcDependencyTimeoutError');
            assert.strictEqual(err.operation, 'DescribeSecurityGroups');
            assert.strictEqual(err.resourceId, 'vpc-stale-002');
            return true;
        }
    );
});

test('F-23 Hardened VPC Cleanup: Unowned VPC is never deleted', async () => {
    const activeRunId = 'run-active-003';
    const deletedCommands = [];

    const mockEc2 = {
        send: async (cmd) => {
            const cmdName = cmd.constructor.name;
            if (cmdName === 'DescribeVpcsCommand' || cmd.input?.Filters?.[0]?.Name === 'tag:UgonduOwner') {
                return {
                    Vpcs: [
                        // Unowned 1: No tags at all
                        { VpcId: 'vpc-unowned-no-tags' },
                        // Unowned 2: Foreign owner tag
                        {
                            VpcId: 'vpc-foreign-owner',
                            Tags: [
                                { Key: 'UgonduOwner', Value: 'other-system' },
                                { Key: 'UgonduRunId', Value: 'run-other' }
                            ]
                        },
                        // Unowned 3: Missing UgonduRunId tag
                        {
                            VpcId: 'vpc-missing-run-id',
                            Tags: [
                                { Key: 'UgonduOwner', Value: 'ugondu-cor' },
                                { Key: 'UgonduLeaseExpiresAt', Value: new Date(Date.now() - 60000).toISOString() }
                            ]
                        },
                        // Unowned 4: Missing UgonduLeaseExpiresAt tag
                        {
                            VpcId: 'vpc-missing-lease-tag',
                            Tags: [
                                { Key: 'UgonduOwner', Value: 'ugondu-cor' },
                                { Key: 'UgonduRunId', Value: 'run-stale-without-lease' }
                            ]
                        }
                    ]
                };
            }
            deletedCommands.push({ cmd: cmdName, input: cmd.input });
            return {};
        }
    };

    const result = await cleanupOwnedCorVpcs(mockEc2, activeRunId);

    assert.strictEqual(result.deletedVpcIds.length, 0, 'No unowned VPCs should be deleted');
    assert.strictEqual(result.deletedSubnetIds.length, 0, 'No subnets should be deleted');
    assert.strictEqual(result.deletedSecurityGroupIds.length, 0, 'No security groups should be deleted');
    assert.strictEqual(deletedCommands.length, 0, 'Zero delete commands must be issued for unowned VPCs');
});

test('F-23 Hardened VPC Cleanup: Active lease is never deleted', async () => {
    const activeRunId = 'run-active-004';
    const deletedCommands = [];

    const mockEc2 = {
        send: async (cmd) => {
            const cmdName = cmd.constructor.name;
            if (cmdName === 'DescribeVpcsCommand' || cmd.input?.Filters?.[0]?.Name === 'tag:UgonduOwner') {
                return {
                    Vpcs: [
                        // Case A: Future lease expiration (active lease)
                        {
                            VpcId: 'vpc-active-lease-future',
                            Tags: [
                                { Key: 'UgonduOwner', Value: 'ugondu-cor' },
                                { Key: 'UgonduRunId', Value: 'run-peer-parallel-001' },
                                { Key: 'UgonduLeaseExpiresAt', Value: new Date(Date.now() + 3600000).toISOString() } // +1 hour
                            ]
                        },
                        // Case B: Active run matching current runId
                        {
                            VpcId: 'vpc-active-current-run',
                            Tags: [
                                { Key: 'UgonduOwner', Value: 'ugondu-cor' },
                                { Key: 'UgonduRunId', Value: activeRunId },
                                { Key: 'UgonduLeaseExpiresAt', Value: new Date(Date.now() - 60000).toISOString() }
                            ]
                        }
                    ]
                };
            }
            deletedCommands.push({ cmd: cmdName, input: cmd.input });
            return {};
        }
    };

    const result = await cleanupOwnedCorVpcs(mockEc2, activeRunId);

    assert.strictEqual(result.deletedVpcIds.length, 0, 'Active lease VPCs must never be deleted');
    assert.strictEqual(deletedCommands.length, 0, 'Zero delete commands must be issued for active leases');
});

test('F-23 Hardened VPC Cleanup: Stale expired VPC with matching ownership tags is cleanly deleted', async () => {
    const activeRunId = 'run-active-current-005';
    const staleRunId = 'run-stale-expired-005';
    const staleVpcId = 'vpc-stale-005';
    const expiredTimestamp = new Date(Date.now() - 3600000).toISOString(); // -1 hour expired

    const manifestOwnership = {
        runId: activeRunId,
        candidateSha: '40e9ba48c5b162540d99ef87b6131c19d424b946',
        owner: 'ugondu-cor',
        createdAt: new Date().toISOString(),
        leaseExpiresAt: new Date(Date.now() + 1800000).toISOString()
    };
    const manifest = new CorResourceManifest(manifestOwnership);

    const executedDeletes = [];

    const mockEc2 = {
        send: async (cmd) => {
            const cmdName = cmd.constructor.name;
            if (cmdName === 'DescribeVpcsCommand') {
                return {
                    Vpcs: [{
                        VpcId: staleVpcId,
                        Tags: [
                            { Key: 'UgonduOwner', Value: 'ugondu-cor' },
                            { Key: 'UgonduRunId', Value: staleRunId },
                            { Key: 'UgonduLeaseExpiresAt', Value: expiredTimestamp }
                        ]
                    }]
                };
            }
            if (cmdName === 'DescribeSecurityGroupsCommand') {
                return {
                    SecurityGroups: [
                        { GroupId: 'sg-default', GroupName: 'default' },
                        { GroupId: 'sg-custom-1', GroupName: 'Ugondu-COR-SG' }
                    ]
                };
            }
            if (cmdName === 'DeleteSecurityGroupCommand') {
                executedDeletes.push({ type: 'sg', id: cmd.input.GroupId });
                return {};
            }
            if (cmdName === 'DescribeSubnetsCommand') {
                return {
                    Subnets: [
                        { SubnetId: 'subnet-1' },
                        { SubnetId: 'subnet-2' }
                    ]
                };
            }
            if (cmdName === 'DeleteSubnetCommand') {
                executedDeletes.push({ type: 'subnet', id: cmd.input.SubnetId });
                return {};
            }
            if (cmdName === 'DeleteVpcCommand') {
                executedDeletes.push({ type: 'vpc', id: cmd.input.VpcId });
                return {};
            }
            throw new Error(`Unhandled command: ${cmdName}`);
        }
    };

    const result = await cleanupOwnedCorVpcs(mockEc2, activeRunId, { manifest });

    // Assert clean deletion order
    assert.deepStrictEqual(result.deletedSecurityGroupIds, ['sg-custom-1']);
    assert.deepStrictEqual(result.deletedSubnetIds, ['subnet-1', 'subnet-2']);
    assert.deepStrictEqual(result.deletedVpcIds, [staleVpcId]);

    // Ensure default SG was NOT touched
    assert.ok(!executedDeletes.some(d => d.id === 'sg-default'), 'default SG must never be deleted');

    // Ensure deletion calls occurred in LIFO / dependency-safe order (SG -> Subnet -> VPC)
    assert.strictEqual(executedDeletes[0].type, 'sg');
    assert.strictEqual(executedDeletes[1].type, 'subnet');
    assert.strictEqual(executedDeletes[2].type, 'subnet');
    assert.strictEqual(executedDeletes[3].type, 'vpc');
    assert.strictEqual(executedDeletes[3].id, staleVpcId);
});

test('F-23 Hardened VPC Cleanup: Delete failure halts and reports residual resource ID', async () => {
    const activeRunId = 'run-active-006';
    const staleVpcId = 'vpc-stale-006';

    // Scenario A: DeleteSecurityGroupCommand fails
    const mockEc2SgDeleteFail = {
        send: async (cmd) => {
            const cmdName = cmd.constructor.name;
            if (cmdName === 'DescribeVpcsCommand') {
                return {
                    Vpcs: [{
                        VpcId: staleVpcId,
                        Tags: [
                            { Key: 'UgonduOwner', Value: 'ugondu-cor' },
                            { Key: 'UgonduRunId', Value: 'run-old-006' },
                            { Key: 'UgonduLeaseExpiresAt', Value: new Date(Date.now() - 60000).toISOString() }
                        ]
                    }]
                };
            }
            if (cmdName === 'DescribeSecurityGroupsCommand') {
                return { SecurityGroups: [{ GroupId: 'sg-failing-001', GroupName: 'custom-sg' }] };
            }
            if (cmdName === 'DeleteSecurityGroupCommand') {
                const err = new Error('DependencyViolation: Cannot delete SG attached to ENI');
                err.name = 'DependencyViolation';
                throw err;
            }
            throw new Error(`Unexpected command: ${cmdName}`);
        }
    };

    await assert.rejects(
        async () => {
            await cleanupOwnedCorVpcs(mockEc2SgDeleteFail, activeRunId);
        },
        (err) => {
            assert.ok(err instanceof CorCleanupExecutionError);
            assert.strictEqual(err.resourceId, 'sg-failing-001', 'Must report failing SG residual ID');
            assert.strictEqual(err.operation, 'DeleteSecurityGroup');
            assert.ok(err.message.includes('sg-failing-001'));
            return true;
        }
    );

    // Scenario B: DeleteSubnetCommand fails
    const mockEc2SubnetDeleteFail = {
        send: async (cmd) => {
            const cmdName = cmd.constructor.name;
            if (cmdName === 'DescribeVpcsCommand') {
                return {
                    Vpcs: [{
                        VpcId: staleVpcId,
                        Tags: [
                            { Key: 'UgonduOwner', Value: 'ugondu-cor' },
                            { Key: 'UgonduRunId', Value: 'run-old-006' },
                            { Key: 'UgonduLeaseExpiresAt', Value: new Date(Date.now() - 60000).toISOString() }
                        ]
                    }]
                };
            }
            if (cmdName === 'DescribeSecurityGroupsCommand') {
                return { SecurityGroups: [] };
            }
            if (cmdName === 'DescribeSubnetsCommand') {
                return { Subnets: [{ SubnetId: 'subnet-residual-002' }] };
            }
            if (cmdName === 'DeleteSubnetCommand') {
                const err = new Error('Subnet in use by interface');
                err.name = 'DependencyViolation';
                throw err;
            }
            throw new Error(`Unexpected command: ${cmdName}`);
        }
    };

    await assert.rejects(
        async () => {
            await cleanupOwnedCorVpcs(mockEc2SubnetDeleteFail, activeRunId);
        },
        (err) => {
            assert.ok(err instanceof CorCleanupExecutionError);
            assert.strictEqual(err.resourceId, 'subnet-residual-002', 'Must report failing subnet residual ID');
            assert.strictEqual(err.operation, 'DeleteSubnet');
            return true;
        }
    );

    // Scenario C: DeleteVpcCommand fails
    const mockEc2VpcDeleteFail = {
        send: async (cmd) => {
            const cmdName = cmd.constructor.name;
            if (cmdName === 'DescribeVpcsCommand') {
                return {
                    Vpcs: [{
                        VpcId: 'vpc-residual-003',
                        Tags: [
                            { Key: 'UgonduOwner', Value: 'ugondu-cor' },
                            { Key: 'UgonduRunId', Value: 'run-old-006' },
                            { Key: 'UgonduLeaseExpiresAt', Value: new Date(Date.now() - 60000).toISOString() }
                        ]
                    }]
                };
            }
            if (cmdName === 'DescribeSecurityGroupsCommand') return { SecurityGroups: [] };
            if (cmdName === 'DescribeSubnetsCommand') return { Subnets: [] };
            if (cmdName === 'DeleteVpcCommand') {
                const err = new Error('Cannot delete VPC with active endpoints');
                err.name = 'DependencyViolation';
                throw err;
            }
            throw new Error(`Unexpected command: ${cmdName}`);
        }
    };

    await assert.rejects(
        async () => {
            await cleanupOwnedCorVpcs(mockEc2VpcDeleteFail, activeRunId);
        },
        (err) => {
            assert.ok(err instanceof CorCleanupExecutionError);
            assert.strictEqual(err.resourceId, 'vpc-residual-003', 'Must report failing VPC residual ID');
            assert.strictEqual(err.operation, 'DeleteVpc');
            return true;
        }
    );
});
