'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function runJestRuntimeProbe({ repoRoot, probeName, probeSource, setupSource, env = {} }) {
  const engineRoot = path.join(repoRoot, 'server', 'engine-core');
  const sourceDir = path.join(engineRoot, 'src');
  const configPath = path.join(engineRoot, 'jest.config.js');
  if (!fs.existsSync(configPath)) {
    throw new Error('COR_JEST_RUNTIME_CONFIG_MISSING');
  }

  const probePath = path.join(sourceDir, `__${probeName}.test.ts`);
  const setupPath = setupSource == null ? null : path.join(engineRoot, `__${probeName}.setup.ts`);
  let config;

  try {
    fs.writeFileSync(probePath, probeSource, { flag: 'wx' });
    if (setupPath) fs.writeFileSync(setupPath, setupSource, { flag: 'wx' });

    const originalConfig = require(configPath);
    config = {
      ...originalConfig,
      rootDir: engineRoot,
      setupFilesAfterEnv: setupPath ? [setupPath] : originalConfig.setupFilesAfterEnv,
    };

    const jestCli = require.resolve('jest/bin/jest.js', { paths: [engineRoot, repoRoot] });
    const result = spawnSync(
      process.execPath,
      [jestCli, '--runInBand', '--runTestsByPath', probePath, '--config', JSON.stringify(config)],
      {
        cwd: engineRoot,
        encoding: 'utf8',
        timeout: 60000,
        maxBuffer: 2 * 1024 * 1024,
        env: { ...process.env, ...env },
      },
    );

    return {
      status: result.status,
      signal: result.signal,
      error: result.error ? String(result.error.message || result.error) : null,
      stdout: result.stdout || '',
      stderr: result.stderr || '',
    };
  } finally {
    try { fs.rmSync(probePath, { force: true }); } catch (_) { /* best-effort cleanup */ }
    if (setupPath) {
      try { fs.rmSync(setupPath, { force: true }); } catch (_) { /* best-effort cleanup */ }
    }
  }
}

module.exports = { runJestRuntimeProbe };
