/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Linux ACL System Boundary
 * File           : LinuxAclSystem.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { spawn } from 'child_process';
import { promises as fs } from 'fs';

/**
 * Operating-system boundary for the Linux ACL adapter. Commands are executed with an
 * argument vector (never through a shell), so values cannot inject shell syntax.
 */
export interface AclSystem {
  exec(file: string, args: string[], input?: string): Promise<{ stdout: string }>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string, mode: number): Promise<void>;
  rename(from: string, to: string): Promise<void>;
  removeFile(path: string): Promise<void>;
}

const EXEC_TIMEOUT_MS = 15_000;
const MAX_OUTPUT_BYTES = 16 * 1024 * 1024;

export const nodeAclSystem: AclSystem = {
  exec(file, args, input) {
    return new Promise((resolve, reject) => {
      const child = spawn(file, args, { shell: false, stdio: ['pipe', 'pipe', 'pipe'], timeout: EXEC_TIMEOUT_MS });
      let stdout = '';
      let stderr = '';
      let size = 0;
      child.stdout.on('data', (d: Buffer) => {
        size += d.length;
        if (size > MAX_OUTPUT_BYTES) { child.kill(); reject(new Error(__t('output_limit_exceeded'))); return; }
        stdout += d.toString('utf8');
      });
      child.stderr.on('data', (d: Buffer) => { stderr += d.toString('utf8'); });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) resolve({ stdout });
        else reject(new Error(stderr.trim() || `${file} exited with code ${code}`));
      });
      child.stdin.end(input ?? '');
    });
  },
  readFile: (path) => fs.readFile(path, 'utf8'),
  writeFile: (path, content, mode) => fs.writeFile(path, content, { mode, flag: 'wx' }),
  rename: (from, to) => fs.rename(from, to),
  removeFile: (path) => fs.rm(path, { force: true }),
};
