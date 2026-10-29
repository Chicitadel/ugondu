'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Run the engine-core build before COR suites that import generated dist files.
 * Skipping the build is rejected because a prior build cannot be independently tied to this exact candidate.
 * Missing build configuration and every non-zero/indeterminate process result fail closed.
 */
function runEngineBuildPreflight({
  root,
  skipBuild = false,
  spawnSync,
  stdout = () => {},
  stderr = () => {},
}) {
  if (skipBuild) {
    const reason = 'UGONDU_SKIP_BUILD is prohibited: COR must build the exact candidate in this process';
    stderr(`[COR-RUNNER] BUILD PREFLIGHT FAILED: ${reason}\n`);
    return { ok: false, skipped: true, reason };
  }

  const engineCoreDir = path.join(root, 'server', 'engine-core');
  const configPath = path.join(engineCoreDir, 'tsconfig.json');
  if (!fs.existsSync(configPath)) {
    const reason = 'engine-core tsconfig.json is missing; refusing to run against possibly stale dist artifacts';
    stderr(`[COR-RUNNER] BUILD PREFLIGHT FAILED: ${reason}\n`);
    return { ok: false, skipped: false, reason };
  }

  stdout('[COR-RUNNER] Compiling engine-core TypeScript...\n');
  let build;
  try {
    build = spawnSync('npx', ['tsc', '--project', 'tsconfig.json'], {
      cwd: engineCoreDir,
      encoding: 'utf8',
      timeout: 120000,
      shell: true,
    });
  } catch (error) {
    const reason = `engine-core build could not start: ${error?.message || 'unknown error'}`;
    stderr(`[COR-RUNNER] BUILD PREFLIGHT FAILED: ${reason}\n`);
    return { ok: false, skipped: false, reason };
  }

  if (build?.status !== 0 || build?.error || build?.signal) {
    const reason = build?.error?.message ||
      (build?.signal ? `build terminated by signal ${build.signal}` :
        `TypeScript compiler exited with status ${String(build?.status)}`);
    if (build?.stdout) stdout(String(build.stdout).slice(-3000));
    if (build?.stderr) stderr(String(build.stderr).slice(-3000));
    stderr(`[COR-RUNNER] BUILD PREFLIGHT FAILED: ${reason}\n`);
    return {
      ok: false,
      skipped: false,
      reason,
      exitCode: Number.isInteger(build?.status) ? build.status : null,
      signal: build?.signal || null,
    };
  }

  stdout('[COR-RUNNER] Compilation complete.\n');
  return { ok: true, skipped: false, reason: 'build-passed', exitCode: 0 };
}

module.exports = { runEngineBuildPreflight };
