import test from 'node:test';
import assert from 'node:assert/strict';
import { renderTaskDefinition } from './render-task-definition.mjs';

const validParams = {
  accountId: '971671216490',
  region: 'eu-west-3',
  imageTag: 'commit-92e7c26f723461fcd5be4550ca9e69912460a14f',
  environmentName: 'staging',
  portabilityTier: 'AWS_EC2',
  dbUrlSecretArn: 'arn:aws:secretsmanager:eu-west-3:971671216490:secret:ugondu/staging/db-url-AbCdEf',
  dbUsernameSecretArn: 'arn:aws:secretsmanager:eu-west-3:971671216490:secret:ugondu/staging/db-username-GhIjKl',
  dbPasswordSecretArn: 'arn:aws:secretsmanager:eu-west-3:971671216490:secret:ugondu/staging/db-password-MnOpQr',
};

test('renders valid EC2 task definition for ugondu backend', () => {
  const doc = renderTaskDefinition(validParams);
  assert.equal(doc.family, 'ugondu-backend-staging');
  assert.equal(doc.networkMode, 'awsvpc');
  assert.deepEqual(doc.requiresCompatibilities, ['EC2', 'FARGATE']);
  assert.equal(doc.cpu, '256');
  assert.equal(doc.memory, '512');
  assert.equal(doc.executionRoleArn, 'arn:aws:iam::971671216490:role/ugonduEcsExecutionRole');
  assert.equal(doc.taskRoleArn, 'arn:aws:iam::971671216490:role/ugonduEcsTaskRole');

  const container = doc.containerDefinitions[0];
  assert.equal(container.name, 'backend-api');
  assert.equal(container.image, '971671216490.dkr.ecr.eu-west-3.amazonaws.com/ugondu-runtime:commit-92e7c26f723461fcd5be4550ca9e69912460a14f');
  assert.equal(container.portMappings[0].containerPort, 4001);
  assert.equal(container.portMappings[0].hostPort, 8081);

  // Federation environment variables
  const envMap = Object.fromEntries(container.environment.map(e => [e.name, e.value]));
  assert.equal(envMap.NODE_ENV, 'staging');
  assert.equal(envMap.PORTABILITY_TIER, 'AWS_EC2');
  assert.equal(envMap.PORT, '4001');
  assert.equal(envMap.UGONDU_BIND_PORT, '8081');
  assert.equal(envMap.IDENTITY_AUTHORITY_URL, 'https://identity.airroofers.eu/api/v1');
  assert.equal(envMap.BILLING_AUTHORITY_URL, 'https://billing.airroofers.eu/api/v1');
  assert.equal(envMap.TELEMETRY_ENDPOINT, 'https://telemetry.airroofers.eu');
  assert.equal(envMap.MANDATAG_LICENSE_ENDPOINT, 'https://license.airroofers.eu');

  // Secrets Manager references
  const secretMap = Object.fromEntries(container.secrets.map(s => [s.name, s.valueFrom]));
  assert.equal(secretMap.UGONDU_DB_URL, validParams.dbUrlSecretArn);
  assert.equal(secretMap.UGONDU_DB_USER, validParams.dbUsernameSecretArn);
  assert.equal(secretMap.UGONDU_DB_PASS, validParams.dbPasswordSecretArn);
});

test('renders valid Fargate task definition for ugondu backend', () => {
  const doc = renderTaskDefinition({ ...validParams, portabilityTier: 'AWS_FARGATE' });
  const container = doc.containerDefinitions[0];
  const envMap = Object.fromEntries(container.environment.map(e => [e.name, e.value]));
  assert.equal(envMap.PORTABILITY_TIER, 'AWS_FARGATE');
});

test('fails closed on invalid AWS account ID', () => {
  assert.throws(() => renderTaskDefinition({ ...validParams, accountId: '123' }), /AWS_ACCOUNT_ID/);
});

test('fails closed on invalid region', () => {
  assert.throws(() => renderTaskDefinition({ ...validParams, region: 'invalid_region' }), /AWS_REGION/);
});

test('fails closed on invalid image tag format', () => {
  assert.throws(() => renderTaskDefinition({ ...validParams, imageTag: 'latest' }), /IMAGE_TAG/);
});

test('fails closed on mismatched secret ARN environment namespace', () => {
  assert.throws(() => renderTaskDefinition({
    ...validParams,
    dbUrlSecretArn: 'arn:aws:secretsmanager:eu-west-3:971671216490:secret:ugondu/production/db-url-AbCdEf',
  }), /Secret ARN environment namespace does not match/);
});
