/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Identity Credential Intake Tests
 * File           : aws-credential-normalization.spec.ts
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
import {
  AwsCredentialNormalizer,
  AwsAuthenticationVerifier,
} from '../providers/aws/aws-normalization';

describe('AwsCredentialNormalizer & AwsAuthenticationVerifier', () => {
  let normalizer: AwsCredentialNormalizer;

  beforeEach(() => {
    normalizer = new AwsCredentialNormalizer();
  });

  it('detects supported AWS CSV headers and rejects unrelated formats', () => {
    const validHeader = `${__t('user_name')},${__t('access_key_id')},${__t('secret_access_key')}`;
    expect(normalizer.supports(validHeader)).toBe(true);
    expect(normalizer.supports('')).toBe(false);
    expect(normalizer.supports('provider,token\ngithub,ghp_123')).toBe(false);
  });

  it('normalizes and trims quoted and padded AWS CSV credential fields', async () => {
    const rawCsv = [
      `"${__t('user_name')}","${__t('access_key_id')}","${__t('secret_access_key')}"`,
      `"  deploy-operator  ","  AKIAIOSFODNN7EXAMPLE  ","  wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY  "`,
    ].join('\r\n');

    const result = await normalizer.normalize(rawCsv);
    expect(result).toEqual({
      provider: 'aws',
      authType: 'access_key',
      payload: {
        userName: 'deploy-operator',
        accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
        secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      },
    });
  });

  it('rejects empty, whitespace-only, or single-line CSV inputs', async () => {
    await expect(normalizer.normalize('')).rejects.toThrow(__t('invalid_aws_csv_format'));
    await expect(normalizer.normalize('   \r\n  \n  ')).rejects.toThrow(__t('invalid_aws_csv_format'));
    await expect(
      normalizer.normalize(`${__t('access_key_id')},${__t('secret_access_key')}\n   `)
    ).rejects.toThrow(__t('invalid_aws_csv_format'));
  });

  it('rejects malformed CSV missing required access key or secret key columns', async () => {
    const missingSecretCsv = `${__t('user_name')},${__t('access_key_id')}\nadmin,AKIA1234567890`;
    await expect(normalizer.normalize(missingSecretCsv)).rejects.toThrow(
      __t('msg_aws_csv_missing_essential_access_key_col')
    );
  });

  it('reconstructs missing userName via STS IAM user ARN or blocks on invalid principal/auth failure', async () => {
    const csvWithoutUser = `${__t('access_key_id')},${__t('secret_access_key')}\nAKIA111,SECRET222`;
    const verifierSpy = jest.spyOn((normalizer as any).verifier, 'verify');

    verifierSpy.mockResolvedValueOnce({
      provider: 'aws',
      accountId: '123456789012',
      principal: 'arn:aws:iam::123456789012:user/platform-bot',
      userId: 'AIDA12345',
      region: 'eu-west-3',
    });

    const reconstructed = await normalizer.normalize(csvWithoutUser);
    expect(reconstructed.payload.userName).toBe('platform-bot');
    expect(reconstructed.payload.accessKeyId).toBe('AKIA111');

    verifierSpy.mockResolvedValueOnce({
      provider: 'aws',
      accountId: '123456789012',
      principal: 'arn:aws:sts::123456789012:assumed-role/AdminRole/session',
      userId: 'AROA12345',
    });
    await expect(normalizer.normalize(csvWithoutUser)).rejects.toThrow(
      __t('msg_normalization_blocked_identity_authentic')
    );

    verifierSpy.mockRejectedValueOnce(new Error('STS unreachable'));
    await expect(normalizer.normalize(csvWithoutUser)).rejects.toThrow(
      __t('msg_normalization_blocked_missing_user_name')
    );
  });

  it('rejects non-AWS credentials in AwsAuthenticationVerifier', async () => {
    const verifier = new AwsAuthenticationVerifier();
    await expect(
      verifier.verify({ provider: 'gcp', authType: 'service_account', payload: {} })
    ).rejects.toThrow(__t('msg_awsauthenticationverifier_requires_an_aw'));
  });
});
