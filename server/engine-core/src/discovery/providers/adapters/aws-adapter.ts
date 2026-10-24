/******************************************************************************
 * Project        : UAIGOS
 * Module         : Engine Core - Discovery
 * File           : aws-adapter.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

import { IProviderAdapter } from '../provider-discovery';
import { ObservationEvent, ObservationStatus, Fact } from '../../model/observation';
import { Logger, __t } from '@ugondu/shared';
import * as crypto from 'crypto';

export interface AwsAdapterCredentials {
  // Strict typed credentials provided by runtime Twin mapping
  secretRef?: string;
  endpoint?: string;
  region?: string;
}

/**
 * @class AwsAdapter
 * @description Native capability resolution engine for aws using dynamic SDK imports.
 * @classification ENTERPRISE
 */
export class AwsAdapter implements IProviderAdapter {
  public readonly id: string = 'aws';

  constructor(private readonly credentials: AwsAdapterCredentials) {}

  public async discover(targetId: string): Promise<ObservationEvent> {
    const startTime = Date.now();
    const facts: Fact[] = [];

    try {
      // Dynamic import to prevent monolithic bloat when aws is not targeted
      let sdk: any;
      try {
        // @ts-ignore
        sdk = await import('@aws-sdk/client-ec2');
      } catch (err: any) {
        Logger.warn(__t('messages.discovery.sdk_missing', { provider: this.id, error: err.message }));
        return this.createEvent(targetId, ObservationStatus.NOT_SUPPORTED, [], startTime, [err.message]);
      }

      // Live capability probing
      const client = new sdk.EC2Client({ region: this.credentials.region ?? 'us-east-1' });
      Logger.info(__t('messages.discovery.probing_provider', { provider: this.id, targetId }));

      const response = await client.send(new sdk.DescribeInstancesCommand({}))();

      facts.push({
        id: crypto.randomUUID(),
        key: 'aws.ec2.instances.raw',
        value: response,
        confidenceScore: 1.0,
        observedAt: new Date(),
        source: this.id
      });

      return this.createEvent(targetId, ObservationStatus.OBSERVED, facts, startTime);

    } catch (error: any) {
      Logger.error(__t('messages.discovery.probe_failed', { provider: this.id, error: error.message }));
      return this.createEvent(targetId, ObservationStatus.FAILED, [], startTime, [error.message]);
    }
  }

  private createEvent(targetId: string, status: ObservationStatus, facts: Fact[], startTime: number, errors?: string[]): ObservationEvent {
    return {
      eventId: crypto.randomUUID(),
      timestamp: new Date(),
      targetId,
      status,
      facts,
      errors,
      executionDurationMs: Date.now() - startTime
    };
  }
}
