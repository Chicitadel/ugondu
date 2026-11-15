/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Dist Entry Resolver
 * File           : ensure-dist-entry.cjs
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-20
 * Last Modified  : 2026-10-20
 * Classification : ENTERPRISE
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
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

'use strict';

const fs = require('fs');
const path = require('path');

function ensureDistEntry() {
  const distDir = path.resolve(__dirname, '..', 'dist');
  if (!fs.existsSync(distDir)) {
    return;
  }

  const indexJs = path.join(distDir, 'index.js');
  const indexDts = path.join(distDir, 'index.d.ts');

  let relTarget = null;
  if (fs.existsSync(path.join(distDir, 'src', 'index.js'))) {
    relTarget = './src/index.js';
  } else if (fs.existsSync(path.join(distDir, 'uppie', 'src', 'index.js'))) {
    relTarget = './uppie/src/index.js';
  }

  if (relTarget) {
    if (!fs.existsSync(indexJs)) {
      fs.writeFileSync(indexJs, `"use strict";\nmodule.exports = require('${relTarget}');\n`, 'utf8');
    }
    if (!fs.existsSync(indexDts)) {
      const dtsTarget = relTarget.replace(/\.js$/, '');
      fs.writeFileSync(indexDts, `export * from '${dtsTarget}';\n`, 'utf8');
    }
  }
}

ensureDistEntry();
