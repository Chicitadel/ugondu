/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Tests / Qualification — Universal Region Selection Suite
 * File           : universal-region-selection.test.js
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-21
 * Last Modified  : 2026-10-21
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '../..');
const { RegionPolicyRenderer } = require('../../server/capabilities/dist/continuity/RegionPolicyRenderer');

let resolverMod = null;
async function getResolver() {
  if (!resolverMod) {
    const modUrl = pathToFileURL(path.join(ROOT, 'scripts/aws-conformance/target-resolver.mjs')).href;
    resolverMod = await import(modUrl);
  }
  return resolverMod;
}

test('URS-001: Beginner-friendly city, country, geography, and native AWS region IDs resolve deterministically', async () => {
  const { resolveRegionInput, AWS_REGION_CATALOGUE } = await getResolver();
  assert.ok(Array.isArray(AWS_REGION_CATALOGUE));
  assert.ok(AWS_REGION_CATALOGUE.length >= 10);

  const cases = [
    ['Paris', 'eu-west-3', 'France'],
    ['France', 'eu-west-3', 'France'],
    ['eu-west-3', 'eu-west-3', 'France'],
    ['South Africa', 'af-south-1', 'South Africa'],
    ['Cape Town', 'af-south-1', 'South Africa'],
    ['Nigeria', 'af-south-1', 'South Africa'],
    ['West Africa', 'af-south-1', 'South Africa'],
    ['Africa', 'af-south-1', 'South Africa'],
    ['af-south-1', 'af-south-1', 'South Africa'],
    ['Frankfurt', 'eu-central-1', 'Germany'],
    ['Germany', 'eu-central-1', 'Germany'],
    ['eu-central-1', 'eu-central-1', 'Germany'],
    ['Dublin', 'eu-west-1', 'Ireland'],
    ['Ireland', 'eu-west-1', 'Ireland'],
    ['London', 'eu-west-2', 'United Kingdom'],
    ['UK', 'eu-west-2', 'United Kingdom'],
    ['Virginia', 'us-east-1', 'United States'],
    ['Oregon', 'us-west-2', 'United States'],
    ['Singapore', 'ap-southeast-1', 'Singapore'],
    ['Tokyo', 'ap-northeast-1', 'Japan'],
    ['Japan', 'ap-northeast-1', 'Japan'],
    ['São Paulo', 'sa-east-1', 'Brazil'],
    ['Brazil', 'sa-east-1', 'Brazil']
  ];

  for (const [input, expectedRegion, expectedCountry] of cases) {
    const res = resolveRegionInput(input);
    assert.equal(res.status, 'RESOLVED', `Expected RESOLVED for input "${input}"`);
    assert.equal(res.decisionState, 'CONFIRMED');
    assert.equal(res.region, expectedRegion, `Expected ${expectedRegion} for "${input}"`);
    assert.deepEqual(res.regions, [expectedRegion]);
    assert.equal(res.country, expectedCountry);
    assert.equal(res.requiresConfirmation, false);
  }
});

test('URS-002: Ambiguous broad geography (Europe, US) returns AMBIGUOUS candidate list and unsupported locations return UNSUPPORTED', async () => {
  const { resolveRegionInput } = await getResolver();

  const europeRes = resolveRegionInput('Europe');
  assert.equal(europeRes.status, 'AMBIGUOUS');
  assert.equal(europeRes.decisionState, 'UNRESOLVED');
  assert.equal(europeRes.region, null);
  assert.deepEqual(europeRes.regions, []);
  assert.ok(Array.isArray(europeRes.matches) && europeRes.matches.length >= 4);
  const europeIds = europeRes.matches.map((m) => m.id);
  assert.ok(europeIds.includes('eu-west-3'));
  assert.ok(europeIds.includes('eu-central-1'));
  assert.ok(europeIds.includes('eu-west-1'));
  assert.ok(europeIds.includes('eu-west-2'));
  assert.match(europeRes.prompt, /Paris, France \[eu-west-3\]/);

  const usRes = resolveRegionInput('US');
  assert.equal(usRes.status, 'AMBIGUOUS');
  assert.equal(usRes.decisionState, 'UNRESOLVED');
  assert.equal(usRes.region, null);
  const usIds = usRes.matches.map((m) => m.id);
  assert.ok(usIds.includes('us-east-1'));
  assert.ok(usIds.includes('us-west-2'));

  const unsupported = resolveRegionInput('Antarctica');
  assert.equal(unsupported.status, 'UNSUPPORTED');
  assert.equal(unsupported.decisionState, 'UNRESOLVED');
  assert.equal(unsupported.region, null);
  assert.deepEqual(unsupported.matches, []);
  assert.ok(Array.isArray(unsupported.alternatives) && unsupported.alternatives.length > 0);
  assert.match(unsupported.prompt, /No AWS region is available for "Antarctica"/);
});

test('URS-003: Missing region without approved config returns REGION_SELECTION_REQUIRED with beginner-friendly examples and no hidden default', async () => {
  const { resolveRegionInput } = await getResolver();

  for (const blank of [undefined, null, '', '   ', []]) {
    const res = resolveRegionInput(blank);
    assert.equal(res.status, 'REGION_SELECTION_REQUIRED');
    assert.equal(res.decisionState, 'UNRESOLVED');
    assert.equal(res.errorCode, 'UG-REGION-SELECTION-REQUIRED');
    assert.equal(res.region, null, 'Must never silently default to eu-west-3 or us-east-1');
    assert.deepEqual(res.regions, []);
    assert.equal(
      res.prompt,
      'Where should Ugondu deploy this workload? Enter a city, country, or provider region ID—for example Paris, France, Nigeria, South Africa, or eu-west-3. If you are unsure, choose Recommend for me.'
    );
    assert.ok(res.examples.includes('Paris'));
    assert.ok(res.examples.includes('France'));
    assert.ok(res.examples.includes('Nigeria'));
    assert.ok(res.examples.includes('South Africa'));
    assert.ok(res.examples.includes('eu-west-3'));
    assert.ok(res.examples.includes('af-south-1'));
  }
});

test('URS-004: Developer in France building for African consumers receives af-south-1 recommendation (audience geography overrides developer IP hint)', async () => {
  const { resolveRegionInput } = await getResolver();

  const res = resolveRegionInput(undefined, {
    audienceGeographies: ['Africa', 'Nigeria'],
    ipCountryHint: 'FR',
    allowIpHint: true
  });

  assert.equal(res.status, 'REQUIRES_CONFIRMATION');
  assert.equal(res.decisionState, 'RECOMMENDATION');
  assert.equal(res.source, 'AUDIENCE_GEOGRAPHY');
  assert.equal(res.recommendedRegion, 'af-south-1');
  assert.equal(res.region, 'af-south-1');
  assert.equal(res.displayName, 'Cape Town, South Africa');
  assert.equal(res.requiresConfirmation, true);
  assert.equal(res.canProvisionWithoutConfirmation, false);
  assert.equal(res.overrodeIpHint, true);
});

test('URS-005: Explicit actor choice (South Africa) overrides conflicting developer IP hint (FR)', async () => {
  const { resolveRegionInput } = await getResolver();

  const res = resolveRegionInput(undefined, {
    userInput: 'South Africa',
    ipCountryHint: 'FR',
    allowIpHint: true
  });

  assert.equal(res.status, 'RESOLVED');
  assert.equal(res.decisionState, 'CONFIRMED');
  assert.equal(res.source, 'EXPLICIT_USER_INPUT');
  assert.equal(res.region, 'af-south-1');
  assert.deepEqual(res.regions, ['af-south-1']);
  assert.equal(res.requiresConfirmation, false);
  assert.equal(res.overrodeIpHint, true);
});

test('URS-006: Privacy verification — IP-based recommendation never persists raw IP addresses and requires confirmation before provisioning', async () => {
  const { resolveRegionInput } = await getResolver();
  const sensitiveIp = '198.51.100.77';

  const rec = resolveRegionInput(undefined, {
    allowIpHint: true,
    ipCountryHint: 'FR',
    rawIp: sensitiveIp
  });

  assert.equal(rec.status, 'REQUIRES_CONFIRMATION');
  assert.equal(rec.decisionState, 'RECOMMENDATION');
  assert.equal(rec.source, 'IP_COUNTRY_HINT');
  assert.equal(rec.recommendedRegion, 'eu-west-3');
  assert.equal(rec.displayName, 'Paris, France');
  assert.equal(rec.requiresConfirmation, true);
  assert.equal(rec.canProvisionWithoutConfirmation, false);
  assert.equal(rec.rawIpPersisted, false);
  assert.equal(rec.redactedIpHint, '[REDACTED]');
  assert.equal(JSON.stringify(rec).includes(sensitiveIp), false, 'Raw IP address must never appear in output');

  const disallowedIpRes = resolveRegionInput(undefined, {
    allowIpHint: false,
    ipCountryHint: 'FR',
    rawIp: sensitiveIp
  });
  assert.equal(disallowedIpRes.status, 'REGION_SELECTION_REQUIRED');
  assert.equal(disallowedIpRes.region, null);
  assert.equal(JSON.stringify(disallowedIpRes).includes(sensitiveIp), false);
});

test('URS-007: Multi-region policy rendering scopes regional resources to both regions while preserving global IAM/S3/STS resources', async () => {
  const { resolveRegionInput } = await getResolver();

  const multiRes = resolveRegionInput(['Paris', 'South Africa']);
  assert.equal(multiRes.status, 'RESOLVED');
  assert.equal(multiRes.decisionState, 'CONFIRMED');
  assert.deepEqual(multiRes.regions, ['eu-west-3', 'af-south-1']);
  assert.equal(multiRes.primaryRegion, 'eu-west-3');
  assert.deepEqual(multiRes.secondaryRegions, ['af-south-1']);

  const renderer = new RegionPolicyRenderer(multiRes.regions);
  const template = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'RegionalComputeAndDatabaseScope',
        Effect: 'Allow',
        Action: ['ec2:RunInstances', 'rds:CreateDBInstance'],
        Resource: [
          'arn:aws:ec2:${REGION}:${ACCOUNT_ID}:instance/*',
          'arn:aws:rds:${REGION}:${ACCOUNT_ID}:db:*'
        ]
      },
      {
        Sid: 'GlobalReadAndRoleScope',
        Effect: 'Allow',
        Action: ['iam:GetRole', 's3:ListAllMyBuckets', 'sts:AssumeRole'],
        Resource: [
          'arn:aws:iam::${ACCOUNT_ID}:role/${EXECUTION_ROLE_NAME}',
          'arn:aws:s3:::ugondu-artifacts-${ACCOUNT_ID}'
        ]
      }
    ]
  };

  const rendered = renderer.renderPolicy(template, {
    accountId: '971671216490',
    allowedRegions: multiRes.regions,
    executionRoleName: 'UgonduCORExecutionRole'
  });

  assert.equal(rendered.valid, true);
  assert.deepEqual(rendered.violations, []);
  assert.deepEqual(rendered.document.Statement[0].Resource, [
    'arn:aws:ec2:eu-west-3:971671216490:instance/*',
    'arn:aws:ec2:af-south-1:971671216490:instance/*',
    'arn:aws:rds:eu-west-3:971671216490:db:*',
    'arn:aws:rds:af-south-1:971671216490:db:*'
  ]);
  assert.deepEqual(rendered.document.Statement[1].Resource, [
    'arn:aws:iam::971671216490:role/UgonduCORExecutionRole',
    'arn:aws:s3:::ugondu-artifacts-971671216490'
  ]);

  const invalidRender = renderer.renderPolicy(template, {
    accountId: '971671216490',
    allowedRegions: ['invalid-region-99'],
    executionRoleName: 'UgonduCORExecutionRole'
  });
  assert.equal(invalidRender.valid, false);
  assert.ok(invalidRender.violations.some((v) => v.includes('violates standard AWS region naming pattern')));
});

test('URS-008: Cross-environment multi-region isolation and residency conflict blocking (CONFLICTS_WITH_POLICY)', async () => {
  const { resolveRegionInput } = await getResolver();

  const environmentRegions = {
    development: 'Paris',
    staging: 'Frankfurt',
    production: 'South Africa'
  };

  const devRes = resolveRegionInput(undefined, { environment: 'development', environmentRegions });
  const stgRes = resolveRegionInput(undefined, { environment: 'staging', environmentRegions });
  const prdRes = resolveRegionInput(undefined, { environment: 'production', environmentRegions });

  assert.equal(devRes.status, 'RESOLVED');
  assert.equal(devRes.region, 'eu-west-3');
  assert.equal(devRes.environment, 'development');

  assert.equal(stgRes.status, 'RESOLVED');
  assert.equal(stgRes.region, 'eu-central-1');
  assert.equal(stgRes.environment, 'staging');

  assert.equal(prdRes.status, 'RESOLVED');
  assert.equal(prdRes.region, 'af-south-1');
  assert.equal(prdRes.environment, 'production');

  assert.notEqual(devRes.region, stgRes.region);
  assert.notEqual(stgRes.region, prdRes.region);
  assert.notEqual(devRes.region, prdRes.region);

  const conflictCountry = resolveRegionInput('Virginia', {
    residencyPolicy: {
      allowedGeographies: ['Europe', 'Africa'],
      prohibitedRegions: ['us-east-1']
    }
  });
  assert.equal(conflictCountry.status, 'CONFLICTS_WITH_POLICY');
  assert.equal(conflictCountry.decisionState, 'BLOCKED');
  assert.equal(conflictCountry.errorCode, 'UG-REGION-POLICY-CONFLICT');
  assert.equal(conflictCountry.region, 'us-east-1');
  assert.match(conflictCountry.reason, /prohibited by residency policy/);

  const conflictSovereign = resolveRegionInput('Frankfurt', {
    residencyPolicy: {
      allowedCountries: ['FR', 'ZA']
    }
  });
  assert.equal(conflictSovereign.status, 'CONFLICTS_WITH_POLICY');
  assert.equal(conflictSovereign.decisionState, 'BLOCKED');
  assert.match(conflictSovereign.reason, /violates country residency requirement/);
});
