import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const templatePath = path.join(root, 'infrastructure/aws/dumcholu-pilot-staging.yaml');
const template = fs.readFileSync(templatePath, 'utf8');

test('pilot template remains a single valid CloudFormation document with portable AMI and AZ inputs', () => {
  assert.equal((template.match(/^AWSTemplateFormatVersion:/gm) || []).length, 1);
  assert.equal((template.match(/^Parameters:/gm) || []).length, 1);
  assert.equal((template.match(/^Resources:/gm) || []).length, 1);
  assert.equal((template.match(/^Outputs:/gm) || []).length, 1);
  assert.match(template, /AvailabilityZone:\n\s+Type: AWS::EC2::AvailabilityZone::Name/);
  assert.match(template, /AmazonLinuxAmiId:\n\s+Type: AWS::SSM::Parameter::Value<AWS::EC2::Image::Id>/);
  assert.match(template, /ImageId: !Ref AmazonLinuxAmiId/);
  assert.doesNotMatch(template, /ami-[a-f0-9]{8,}/i);
});

test('cost parameter creates actual AWS Budgets notifications and does not claim a hard cap', () => {
  assert.match(template, /MonthlyCostBudget:\n\s+Type: AWS::Budgets::Budget/);
  assert.match(template, /Amount: !Ref MonthlyBudgetLimit/);
  assert.match(template, /NotificationType: ACTUAL\n\s+Threshold: 80/);
  assert.match(template, /NotificationType: FORECASTED\n\s+Threshold: 100/);
  assert.match(template, /this is not a hard spending cap/i);
});

test('unconfigured host has no public ingress or exposed SSH port', () => {
  const start = template.indexOf('  SharedWebSecurityGroup:');
  const end = template.indexOf('  DumcholuBackendSecurityGroup:', start);
  assert.ok(start >= 0 && end > start, 'shared web security group must exist');
  const webGroup = template.slice(start, end);
  assert.doesNotMatch(webGroup, /SecurityGroupIngress:/);
  assert.doesNotMatch(template, /FromPort:\s*22\b/);
  assert.match(webGroup, /No public ingress until a separately reviewed TLS edge is deployed/);
});

test('bootstrap downloads an explicitly versioned Docker Compose binary and checks its SHA-256 before use', () => {
  assert.match(template, /DockerComposeVersion:\n\s+Type: String/);
  assert.match(template, /AllowedPattern: '\^v\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+\$'/);
  assert.match(template, /DockerComposeSha256:\n\s+Type: String\n\s+MinLength: 64\n\s+MaxLength: 64/);
  assert.match(template, /releases\/download\/\$\{DockerComposeVersion\}\/docker-compose-linux-x86_64/);
  assert.match(template, /\$\{DockerComposeSha256\}.*sha256sum --check --status/);
  assert.doesNotMatch(template, /docker\/compose\/releases\/latest/);
});

test('backend ports remain scoped to the shared edge security group, not public CIDRs', () => {
  const cases = [
    ['8080', 'DumcholuBackendSecurityGroup', 'UgonduBackendSecurityGroup'],
    ['8081', 'UgonduBackendSecurityGroup', 'UUVBackendSecurityGroup'],
    ['8082', 'UUVBackendSecurityGroup', 'PilotInstanceRole'],
  ];
  for (const [port, group, nextGroup] of cases) {
    const start = template.indexOf(`  ${group}:`);
    const end = template.indexOf(`  ${nextGroup}:`, start + 1);
    assert.ok(start >= 0 && end > start, `${group} section must exist`);
    const section = template.slice(start, end);
    assert.match(section, new RegExp(`FromPort: ${port}\\n\\s+ToPort: ${port}\\n\\s+SourceSecurityGroupId: !Ref SharedWebSecurityGroup`));
    assert.doesNotMatch(section, /CidrIp:/);
  }
});
