/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Tests / Locales & Zero Hardcoding Suite
 * File           : locales.spec.ts
 * Version        : 2.4.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-24
 * Last Modified  : 2026-10-24
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
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS
 * - NIST SP 800-53
 *
 * Signatures:
 * - Enterprise Architecture Council
 * - Ujomor Systems Governance Authority
 * - Air Roofers Release Engineering
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import * as fs from 'fs';
import * as path from 'path';
import { __t, setLocale, getLocale, getSupportedLocales, isLocaleSupported } from '../i18n';

describe('Universal Localization & Zero-Hardcoding Governance Suite', () => {
  const sharedLocalesDir = path.resolve(__dirname, '../locales');
  const clientLocalesDir = path.resolve(__dirname, '../../../locales');

  const sourceLocale = 'en.json';
  const productionLocales = [
    'ar.json', 'de.json', 'es.json', 'fr.json', 'hi.json',
    'it.json', 'ja.json', 'ko.json', 'pt.json', 'ru.json', 'zh.json'
  ];

  function flattenKeys(obj: Record<string, any>, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
        Object.assign(result, flattenKeys(val, fullKey));
      } else {
        result[fullKey] = String(val);
      }
    }
    return result;
  }

  function extractPlaceholders(text: string): string[] {
    const matches = text.match(/\{+[^{}]+\}+/g) || [];
    return matches.sort();
  }

  describe('Server/Shared Locales Catalog Parity & Completeness', () => {
    let sourceCatalog: Record<string, string>;

    beforeAll(() => {
      const sourcePath = path.join(sharedLocalesDir, sourceLocale);
      expect(fs.existsSync(sourcePath)).toBe(true);
      sourceCatalog = flattenKeys(JSON.parse(fs.readFileSync(sourcePath, 'utf8')));
    });

    test.each(productionLocales)('should enforce 100%% key parity for %s', (localeFile) => {
      const localePath = path.join(sharedLocalesDir, localeFile);
      expect(fs.existsSync(localePath)).toBe(true);

      const targetCatalog = flattenKeys(JSON.parse(fs.readFileSync(localePath, 'utf8')));
      const sourceKeys = Object.keys(sourceCatalog);
      const targetKeys = Object.keys(targetCatalog);

      const missingKeys = sourceKeys.filter((k) => !(k in targetCatalog));
      expect(missingKeys).toEqual([]);

      const extraKeys = targetKeys.filter((k) => !(k in sourceCatalog));
      expect(extraKeys).toEqual([]);
    });

    test.each(productionLocales)('should enforce placeholder consistency for %s', (localeFile) => {
      const localePath = path.join(sharedLocalesDir, localeFile);
      const targetCatalog = flattenKeys(JSON.parse(fs.readFileSync(localePath, 'utf8')));

      for (const [key, sourceVal] of Object.entries(sourceCatalog)) {
        const targetVal = targetCatalog[key];
        const srcPlaceholders = extractPlaceholders(sourceVal);
        const tgtPlaceholders = extractPlaceholders(targetVal);
        expect(tgtPlaceholders).toEqual(srcPlaceholders);
      }
    });

    test.each(productionLocales)('should reject empty or placeholder strings in %s', (localeFile) => {
      const localePath = path.join(sharedLocalesDir, localeFile);
      const targetCatalog = flattenKeys(JSON.parse(fs.readFileSync(localePath, 'utf8')));
      const fakePrefixRe = /^\[(?:AR|DE|EN|ES|FR|HI|IT|JA|KO|PT|RU|ZH)(?:-[A-Z]{2,4})?\]\s*/i;

      for (const [, val] of Object.entries(targetCatalog)) {
        expect(val.trim().length).toBeGreaterThan(0);
        expect(val).not.toBe('__UNTRANSLATED__');
        expect(fakePrefixRe.test(val)).toBe(false);
      }
    });
  });

  describe('Client Root Locales Catalog Parity & Completeness', () => {
    let sourceCatalog: Record<string, string>;

    beforeAll(() => {
      const sourcePath = path.join(clientLocalesDir, sourceLocale);
      expect(fs.existsSync(sourcePath)).toBe(true);
      sourceCatalog = flattenKeys(JSON.parse(fs.readFileSync(sourcePath, 'utf8')));
    });

    test.each(productionLocales)('should enforce 100%% key parity for %s', (localeFile) => {
      const localePath = path.join(clientLocalesDir, localeFile);
      expect(fs.existsSync(localePath)).toBe(true);

      const targetCatalog = flattenKeys(JSON.parse(fs.readFileSync(localePath, 'utf8')));
      const missingKeys = Object.keys(sourceCatalog).filter((k) => !(k in targetCatalog));
      expect(missingKeys).toEqual([]);

      const extraKeys = Object.keys(targetCatalog).filter((k) => !(k in sourceCatalog));
      expect(extraKeys).toEqual([]);
    });
  });

  describe('Runtime Translation Engine Behavior', () => {
    beforeEach(() => {
      setLocale('en');
    });

    test('should resolve default English tokens correctly', () => {
      expect(getLocale()).toBe('en');
      const text = __t('ai.error.region_required_or_ambiguous');
      expect(text).toContain('Explicit target region is required');
    });

    test('should translate accurately when locale switched to French', () => {
      setLocale('fr');
      expect(getLocale()).toBe('fr');
      const text = __t('ai.error.region_required_or_ambiguous');
      expect(text).toContain('Une région cible explicite est requise');
    });

    test('should translate accurately when locale switched to German', () => {
      setLocale('de');
      expect(getLocale()).toBe('de');
      const text = __t('ai.error.region_required_or_ambiguous');
      expect(text).toContain('Eine explizite Zielregion ist erforderlich');
    });

    test('should verify supported locales includes standard production languages', () => {
      const supported = getSupportedLocales();
      expect(supported).toContain('en');
      expect(supported).toContain('fr');
      expect(supported).toContain('de');
      expect(supported).toContain('es');
      expect(supported).toContain('it');
      expect(isLocaleSupported('fr')).toBe(true);
      expect(isLocaleSupported('nonexistent-locale')).toBe(false);
    });

    test('should gracefully fall back to English for unknown locale', () => {
      setLocale('xx-unknown');
      const text = __t('ai.error.region_required_or_ambiguous');
      expect(text).toContain('Explicit target region is required');
    });

    test('should interpolate named parameters accurately', () => {
      setLocale('en');
      const interpolated = __t('err_unknown_cmd', { '%s': 'build-custom' });
      expect(interpolated).toBeDefined();
    });
  });

  describe('AI Inference Gateway Tokenization Integrity', () => {
    beforeAll(() => {
      setLocale('en');
    });

    test('should verify all critical AI error tokens are registered and non-empty', () => {
      const criticalAiTokens = [
        'ai.error.region_required_or_ambiguous',
        'ai.error.invalid_lifecycle_transition',
        'ai.error.model_not_qualified',
        'ai.error.immutable_tool_schema_override_prohibited',
        'ai.error.tool_schema_invalid',
        'ai.error.model_alias_required_no_substitution',
        'ai.prompt.explicit_region_required',
        'ai.prompt.ambiguous_region_specified'
      ];

      for (const token of criticalAiTokens) {
        const resolved = __t(token);
        expect(resolved).toBeDefined();
        expect(resolved).not.toBe(token);
        expect(resolved.trim().length).toBeGreaterThan(10);
      }
    });
  });
});
