/******************************************************************************
 * Project        : Ugondu Platform
 * Module         : Passport Parser
 * File           : intent-parser.ts
 * Version        : 1.0.0
 * Author         : Platform Engineering Team
 * Organization   : Air Roofers
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-02
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 * - Modularization Enforced
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers
 * All Rights Reserved.
 ******************************************************************************/

import * as fs from 'fs';
import * as path from 'path';
import type { ParsedIntent } from '../compiler/passport-compiler';

export class IntentParser {
  public async parseFile(filePath: string): Promise<ParsedIntent> {
    const resolved = path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`IntentParser: file not found: ${resolved}`);
    }
    const raw = fs.readFileSync(resolved, 'utf-8');
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new Error(`IntentParser: invalid JSON in intent file: ${resolved}`);
    }
    if (!data['action'] || typeof data['action'] !== 'string') {
      throw new Error(`IntentParser: intent file must contain an 'action' string field`);
    }
    return {
      action: data['action'] as string,
      targetId: (data['targetId'] as string) ?? 'default',
      capabilities: Array.isArray(data['capabilities']) ? data['capabilities'] as string[] : [],
      priority: data['priority'] as string | undefined,
      metadata: (data['metadata'] as Record<string, unknown>) ?? {},
    };
  }

  public async parse(text: string): Promise<ParsedIntent> {
    try {
      return JSON.parse(text) as ParsedIntent;
    } catch {
      throw new Error('IntentParser: invalid JSON intent string');
    }
  }
}
