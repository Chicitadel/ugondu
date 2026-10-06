/**
 * Project        : Universal Autonomous AI Governance Operating System
 * Module         : Locales Validator
 * File           : validate-locales.js
 * Version        : 1.0.0
 * Author         : Air Roofers Engineering
 * Organization   : Air Roofers
 * Created Date   : 2026-10-01
 * Last Modified  : 2026-10-01
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Security Reviewed
 * - Architecture Controlled
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../locales');
const FILES = ['en.json', 'fr.json', 'de.json', 'es.json', 'it.json'];

// We only allow identical values for visual structural keys
const STRUCTURAL_KEYS = new Set([
  'cli_divider',
  'status_border',
  'status_divider',
  'status_lbl_step_item',
  'status_lbl_log_item'
]);

function validateLocales() {
  const data = {};
  for (const file of FILES) {
    const content = fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8');
    data[file] = JSON.parse(content);
  }

  const enKeys = new Set(Object.keys(data['en.json']));
  let hasError = false;

  for (const file of FILES) {
    if (file === 'en.json') continue;

    const locKeys = new Set(Object.keys(data[file]));
    
    // Check missing keys
    for (const key of enKeys) {
      if (!locKeys.has(key)) {
        console.error(`[Error] ${file} is missing key: ${key}`);
        hasError = true;
      }
    }
    
    // Check extra keys
    for (const key of locKeys) {
      if (!enKeys.has(key)) {
        console.error(`[Error] ${file} has extra key: ${key}`);
        hasError = true;
      }
    }

    // Check identical values for non-structural keys
    for (const key of enKeys) {
      if (locKeys.has(key) && !STRUCTURAL_KEYS.has(key)) {
        if (data[file][key] === data['en.json'][key]) {
          console.error(`[Error] ${file} has identical translation for non-structural key: ${key}`);
          hasError = true;
        }
      }
    }
  }

  if (hasError) {
    console.error('Locale validation failed.');
    process.exit(1);
  } else {
    console.log('Locale validation passed.');
    process.exit(0);
  }
}

validateLocales();
