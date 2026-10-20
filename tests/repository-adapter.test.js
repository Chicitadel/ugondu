/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tests / Integration — Repository Adapter & SSRF Hardening
 * File           : repository-adapter.test.js
 * Version        : 2.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU / Ujomor Systems
 * Created Date   : 2026-09-29
 * Last Modified  : 2026-10-20
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
 * Copyright (c) 2026 Air Roofers SASU / Ujomor Systems. All Rights Reserved.
 ******************************************************************************/

'use strict';

const assert = require('assert');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const { test, before, after } = require('node:test');

function post(port, reqPath, body, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port,
      path: reqPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...extraHeaders,
      },
    };
    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => (responseBody += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(responseBody) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: responseBody });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(port, reqPath, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { hostname: 'localhost', port, path: reqPath, headers: extraHeaders },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, headers: res.headers, body });
          }
        });
      }
    );
    req.on('error', reject);
  });
}

function waitForServer(port, retries = 30, interval = 200) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const req = http.get({ hostname: 'localhost', port, path: '/health/ready' }, (res) => {
        if (res.statusCode === 200) return resolve();
        retry();
      });
      req.on('error', retry);
      req.end();
    };
    const retry = () => {
      if (attempts >= retries) {
        return reject(new Error(`Server failed to start on port ${port} after ${retries} attempts`));
      }
      setTimeout(check, interval);
    };
    check();
  });
}

let ADAPTER_PORT = parseInt(process.env.ADAPTER_PORT || '4005', 10);
let serverProcess = null;

before(async () => {
  try {
    await new Promise((resolve, reject) => {
      const req = http.get({ hostname: 'localhost', port: ADAPTER_PORT, path: '/health/ready' }, (res) => {
        if (res.statusCode === 200) return resolve();
        reject(new Error('Not 200'));
      });
      req.on('error', reject);
      req.end();
    });
  } catch {
    const serverPath = path.resolve(__dirname, '../server/repository-adapter/dist/index.js');
    serverProcess = spawn('node', [serverPath], {
      env: { ...process.env, PORT: String(ADAPTER_PORT) },
      stdio: 'pipe',
    });
    await waitForServer(ADAPTER_PORT);
  }
});

after(() => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

test('RA-001: URL resolution across 11 Git repository providers', async () => {
  const testCases = [
    { url: 'https://github.com/example/repo', expected: 'github', tokenEnv: 'UGONDU_GITHUB_TOKEN' },
    { url: 'https://gitlab.com/example/repo', expected: 'gitlab', tokenEnv: 'UGONDU_GITLAB_TOKEN' },
    { url: 'https://bitbucket.org/example/repo', expected: 'bitbucket', tokenEnv: 'UGONDU_BITBUCKET_TOKEN' },
    { url: 'git@github.com:example/repo.git', expected: 'github', tokenEnv: 'UGONDU_GITHUB_TOKEN' },
    { url: 'git@gitlab.com:example/repo.git', expected: 'gitlab', tokenEnv: 'UGONDU_GITLAB_TOKEN' },
    { url: 'https://dev.azure.com/org/project/_git/repo', expected: 'azure-devops', tokenEnv: 'UGONDU_AZURE_DEVOPS_TOKEN' },
    { url: 'https://git-codecommit.us-east-1.amazonaws.com/v1/repos/my-repo', expected: 'aws-codecommit', tokenEnv: 'AWS_ROLE_ARN' },
    { url: 'https://mygitea.example.com/user/repo', expected: 'gitea', tokenEnv: 'UGONDU_GITEA_TOKEN' },
    { url: 'https://mygogs.example.com/user/repo', expected: 'gogs', tokenEnv: 'UGONDU_GOGS_TOKEN' },
    { url: 'https://example.com/repo.git', expected: 'generic-https', tokenEnv: 'UGONDU_GIT_TOKEN' },
    { url: 'git@git.example.com:team/repo.git', expected: 'generic-ssh', tokenEnv: 'UGONDU_SSH_KEY_PATH' },
  ];

  for (const tc of testCases) {
    const r = await post(ADAPTER_PORT, '/v1/repository/resolve', { repositoryUrl: tc.url });
    assert.strictEqual(r.status, 200, `[en] Expected 200, got ${r.status}`);
    assert.strictEqual(
      r.body.metadata.provider,
      tc.expected,
      `[en] URL '${tc.url}' expected provider '${tc.expected}', got '${r.body.metadata.provider}'`
    );
    assert.strictEqual(
      r.body.metadata.credentialEnvKey,
      tc.tokenEnv,
      `[en] Expected credentialEnvKey '${tc.tokenEnv}', got '${r.body.metadata.credentialEnvKey}'`
    );
  }
  console.log('[en] ✓ PASS: URL resolution across 11 Git repository providers verified');
});

test('RA-002: Verified SSH URL normalization to HTTPS for GitHub vs preserved SSH for Generic-SSH', async () => {
  const r = await post(ADAPTER_PORT, '/v1/repository/resolve', {
    repositoryUrl: 'git@github.com:example/repo.git',
  });
  assert.strictEqual(r.status, 200);
  assert.ok(
    r.body.metadata.cloneUrl.startsWith('https://'),
    `[en] Expected GitHub SSH cloneUrl to be normalized to HTTPS, got: ${r.body.metadata.cloneUrl}`
  );

  const genericSshRes = await post(ADAPTER_PORT, '/v1/repository/resolve', {
    repositoryUrl: 'git@git.example.com:team/repo.git',
  });
  assert.strictEqual(genericSshRes.status, 200);
  assert.strictEqual(genericSshRes.body.metadata.cloneUrl, 'git@git.example.com:team/repo.git');
  console.log('[en] ✓ PASS: Verified SSH-to-HTTPS mapping for GitHub and preserved SSH for Generic-SSH');
});

test('RA-003: Adversarial lookalike URLs, SSRF, embedded credentials, custom ports, and traversal rejected', async () => {
  const adversarialUrls = [
    { url: 'https://evil.com/github.com/org/repo', expectedCode: 'LOOKALIKE_URL_FORBIDDEN' },
    { url: 'https://github.com.evil.com/org/repo', expectedCode: 'LOOKALIKE_URL_FORBIDDEN' },
    { url: 'http://169.254.169.254/gitea/repo', expectedCode: 'SSRF_BLOCKED' },
    { url: 'https://127.0.0.1/org/repo.git', expectedCode: 'SSRF_BLOCKED' },
    { url: 'https://localhost/org/repo.git', expectedCode: 'SSRF_BLOCKED' },
    { url: 'https://10.0.0.1/org/repo.git', expectedCode: 'SSRF_BLOCKED' },
    { url: 'https://192.168.1.1/org/repo.git', expectedCode: 'SSRF_BLOCKED' },
    { url: 'https://user:pass@github.com/org/repo', expectedCode: 'EMBEDDED_CREDENTIALS_FORBIDDEN' },
    { url: 'https://github.com:8443/org/repo', expectedCode: 'UNEXPECTED_PORT_FORBIDDEN' },
    { url: 'https://github.com/org/../etc/passwd', expectedCode: 'PATH_TRAVERSAL_FORBIDDEN' },
    { url: 'https://github.com/org/repo?token=secret', expectedCode: 'QUERY_OR_FRAGMENT_FORBIDDEN' },
  ];

  for (const adv of adversarialUrls) {
    const r = await post(ADAPTER_PORT, '/v1/repository/resolve', { repositoryUrl: adv.url });
    assert.strictEqual(r.status, 400, `[en] Expected 400 for '${adv.url}', got ${r.status}`);
    assert.strictEqual(r.body.code, adv.expectedCode, `[en] Expected code '${adv.expectedCode}', got '${r.body.code}'`);
  }
  console.log('[en] ✓ PASS: Rejected 11 adversarial repository URLs with expected security error codes');
});

test('RA-004: AWS CodeCommit OIDC/IAM role strategy vs static secret key rejection', async () => {
  const rejectStatic = await post(ADAPTER_PORT, '/v1/repository/validate-credentials', {
    providerId: 'aws-codecommit',
    awsAccessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    awsSecretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    awsRegion: 'us-east-1',
  });
  assert.strictEqual(rejectStatic.status, 400);
  assert.strictEqual(rejectStatic.body.valid, false);
  assert.strictEqual(rejectStatic.body.code, 'STATIC_IAM_CREDENTIALS_FORBIDDEN');

  const acceptOidc = await post(ADAPTER_PORT, '/v1/repository/validate-credentials', {
    providerId: 'aws-codecommit',
    awsRoleArn: 'arn:aws:iam::123456789012:role/UgonduCodeCommitRole',
    awsWebIdentityTokenFile: '/var/run/secrets/eks.amazonaws.com/serviceaccount/token',
    awsRegion: 'us-east-1',
  });
  assert.strictEqual(acceptOidc.status, 200);
  assert.strictEqual(acceptOidc.body.valid, true);
  assert.strictEqual(acceptOidc.body.validation.credentialEnvKey, 'AWS_ROLE_ARN');
  console.log('[en] ✓ PASS: AWS CodeCommit OIDC/IAM role credential validation & static secret rejection');
});

test('RA-005: Standardized /health, /health/live, /health/ready, /v1/metadata & W3C traceparent', async () => {
  const traceHeader = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
  const h1 = await get(ADAPTER_PORT, '/health', { traceparent: traceHeader });
  const hLive = await get(ADAPTER_PORT, '/health/live');
  const hReady = await get(ADAPTER_PORT, '/health/ready');
  const hMeta = await get(ADAPTER_PORT, '/v1/metadata');

  assert.strictEqual(h1.status, 200);
  assert.strictEqual(hLive.status, 200);
  assert.strictEqual(hReady.status, 200);
  assert.strictEqual(hMeta.status, 200);
  assert.strictEqual(h1.headers['traceparent'], traceHeader);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(h1.body, 'cor_level'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(hLive.body, 'cor_level'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(hReady.body, 'cor_level'), false);
  assert.strictEqual(hReady.body.ready, true);
  console.log('[en] ✓ PASS: /health, /health/live, /health/ready, /v1/metadata & traceparent verified');
});

test('RA-006: Full capability endpoints (/metadata, /refs, /fetch, /providers) & missing URL 400', async () => {
  const missingRes = await post(ADAPTER_PORT, '/v1/repository/resolve', {});
  assert.strictEqual(missingRes.status, 400);

  const provRes = await get(ADAPTER_PORT, '/v1/repository/providers');
  assert.strictEqual(provRes.status, 200);
  assert.ok(Array.isArray(provRes.body.providers) && provRes.body.providers.length >= 8);
  assert.ok(Array.isArray(provRes.body.adapters) && provRes.body.adapters.length >= 8);

  const metaRes = await post(ADAPTER_PORT, '/v1/repository/metadata', {
    repositoryUrl: 'https://github.com/example/repo',
  });
  assert.strictEqual(metaRes.status, 200);
  assert.strictEqual(metaRes.body.metadata.capabilities.fetch, 'tested');

  const refsRes = await post(ADAPTER_PORT, '/v1/repository/refs', {
    repositoryUrl: 'https://github.com/example/repo',
  });
  assert.strictEqual(refsRes.status, 200);
  assert.ok(Array.isArray(refsRes.body.refs) && refsRes.body.refs.length > 0);

  const fetchRes = await post(ADAPTER_PORT, '/v1/repository/fetch', {
    repositoryUrl: 'https://github.com/example/repo',
    branch: 'main',
  });
  assert.strictEqual(fetchRes.status, 200);
  assert.strictEqual(fetchRes.body.artifact.verified, true);
  console.log('[en] ✓ PASS: Full capability contracts (/metadata, /refs, /fetch, /providers) verified');
});
