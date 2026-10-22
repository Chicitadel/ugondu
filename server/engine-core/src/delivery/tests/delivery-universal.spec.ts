/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Universal Delivery Orchestration Tests
 * File           : delivery-universal.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-22
 * Last Modified  : 2026-10-22
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS / NIST
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { __t } from '@ugondu/shared';
import { UniversalDeliveryEngine } from '../execution/UniversalDeliveryEngine';
import { ISourceAdapter } from '../contract/SourceContract';
import { DeliveryArtifact } from '../contract/DeliveryTransaction';

describe('UniversalDeliveryEngine Orchestration & Target Validation', () => {
  let engine: UniversalDeliveryEngine;
  let mockSource: jest.Mocked<ISourceAdapter>;

  beforeEach(() => {
    engine = new UniversalDeliveryEngine();
    mockSource = {
      authenticate: jest.fn().mockResolvedValue({
        sourceId: 'src-git-01',
        authenticityVerified: true,
        trustLevel: 'VERIFIED',
      }),
      discoverCapabilities: jest.fn().mockResolvedValue({
        supportsHistory: true,
        supportsSignatures: true,
        supportsAtomicReads: true,
      }),
      resolveArtifact: jest.fn().mockResolvedValue({
        id: 'art-100',
        digest: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      } as DeliveryArtifact),
      fetchPayload: jest.fn().mockResolvedValue('/tmp/sandbox/art-100'),
    };
  });

  it('completes DEPLOY and RESTORE transactions when source and destination are valid', async () => {
    const destinationAdapter = {
      getInstanceStatus: jest.fn().mockResolvedValue({ state: 'running' }),
    };

    const deployResult = await engine.executeTransaction(mockSource, destinationAdapter, 'DEPLOY');
    expect(deployResult).toBe(true);
    expect(mockSource.authenticate).toHaveBeenCalledTimes(1);
    expect(mockSource.discoverCapabilities).toHaveBeenCalledTimes(1);
    expect(mockSource.resolveArtifact).toHaveBeenCalledTimes(1);
    expect(destinationAdapter.getInstanceStatus).toHaveBeenCalledWith('ugondu_site');

    const restoreResult = await engine.executeTransaction(mockSource, destinationAdapter, 'RESTORE');
    expect(restoreResult).toBe(true);
    expect(destinationAdapter.getInstanceStatus).toHaveBeenCalledTimes(2);
  });

  it('rejects when source adapter fails to resolve a verifiable artifact', async () => {
    mockSource.resolveArtifact.mockResolvedValueOnce(null as unknown as DeliveryArtifact);
    const destinationAdapter = {
      getInstanceStatus: jest.fn().mockResolvedValue({ state: 'running' }),
    };

    await expect(
      engine.executeTransaction(mockSource, destinationAdapter, 'DEPLOY')
    ).rejects.toThrow(__t('failed_to_resolve_artifact_fro'));
    expect(destinationAdapter.getInstanceStatus).not.toHaveBeenCalled();
  });

  it('rejects when destination adapter fails compliance validation', async () => {
    await expect(
      engine.executeTransaction(mockSource, null, 'DEPLOY')
    ).rejects.toThrow(__t('msg_destination_adapter_compliance_validatio'));

    await expect(
      engine.executeTransaction(mockSource, { invalidAdapter: true }, 'DEPLOY')
    ).rejects.toThrow(__t('msg_destination_adapter_compliance_validatio'));
  });

  it('aborts transaction when target destination state is failed or missing', async () => {
    const failedDestination = {
      getInstanceStatus: jest.fn().mockResolvedValue({ state: 'failed' }),
    };

    await expect(
      engine.executeTransaction(mockSource, failedDestination, 'DEPLOY')
    ).rejects.toThrow(__t('msg_deployment_failed_target_state_is_unstab'));

    const nullStateDestination = {
      getInstanceStatus: jest.fn().mockResolvedValue(null),
    };

    await expect(
      engine.executeTransaction(mockSource, nullStateDestination, 'RESTORE')
    ).rejects.toThrow(__t('msg_deployment_failed_target_state_is_unstab'));
  });
});
