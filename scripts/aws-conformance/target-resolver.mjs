/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : AWS Conformance / Target Resolver & Boundary Validator
 * File           : target-resolver.mjs
 * Version        : 1.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-20
 * Last Modified  : 2026-10-21
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../..');
const CONFIG_PATH = path.join(ROOT, 'config/qualification/aws-target.json');

const REGION_REGEX = /^[a-z]{2}-[a-z]+-\d$/;
const ACCOUNT_REGEX = /^\d{12}$/;

const cat = (id, city, country, countryCode, geography, displayName, aliases) =>
  Object.freeze({ id, city, country, countryCode, geography, displayName, aliases: Object.freeze(aliases) });

export const AWS_REGION_CATALOGUE = Object.freeze([
  cat('eu-west-3', 'Paris', 'France', 'FR', 'Europe', 'Paris, France', ['eu-west-3', 'paris', 'france', 'fr', 'ile-de-france']),
  cat('af-south-1', 'Cape Town', 'South Africa', 'ZA', 'Africa', 'Cape Town, South Africa', [
    'af-south-1', 'cape town', 'south africa', 'za', 'africa', 'nigeria', 'ng', 'west africa', 'lagos', 'kenya', 'ke', 'sub-saharan africa'
  ]),
  cat('eu-central-1', 'Frankfurt', 'Germany', 'DE', 'Europe', 'Frankfurt, Germany', ['eu-central-1', 'frankfurt', 'germany', 'de', 'deutschland']),
  cat('eu-west-1', 'Dublin', 'Ireland', 'IE', 'Europe', 'Dublin, Ireland', ['eu-west-1', 'dublin', 'ireland', 'ie']),
  cat('eu-west-2', 'London', 'United Kingdom', 'GB', 'Europe', 'London, United Kingdom', ['eu-west-2', 'london', 'uk', 'united kingdom', 'gb', 'great britain']),
  cat('us-east-1', 'Virginia', 'United States', 'US', 'North America', 'N. Virginia, United States', ['us-east-1', 'virginia', 'n. virginia', 'northern virginia', 'us east']),
  cat('us-west-2', 'Oregon', 'United States', 'US', 'North America', 'Oregon, United States', ['us-west-2', 'oregon', 'portland', 'us west']),
  cat('ap-southeast-1', 'Singapore', 'Singapore', 'SG', 'Asia Pacific', 'Singapore', ['ap-southeast-1', 'singapore', 'sg', 'southeast asia']),
  cat('ap-northeast-1', 'Tokyo', 'Japan', 'JP', 'Asia Pacific', 'Tokyo, Japan', ['ap-northeast-1', 'tokyo', 'japan', 'jp']),
  cat('sa-east-1', 'São Paulo', 'Brazil', 'BR', 'South America', 'São Paulo, Brazil', ['sa-east-1', 'sao paulo', 'brazil', 'br', 'south america'])
]);

const AMBIGUOUS_GEOGRAPHY_MAP = Object.freeze({
  europe: ['eu-west-3', 'eu-central-1', 'eu-west-1', 'eu-west-2'],
  eu: ['eu-west-3', 'eu-central-1', 'eu-west-1', 'eu-west-2'],
  'european union': ['eu-west-3', 'eu-central-1', 'eu-west-1'],
  us: ['us-east-1', 'us-west-2'],
  usa: ['us-east-1', 'us-west-2'],
  'united states': ['us-east-1', 'us-west-2'],
  'north america': ['us-east-1', 'us-west-2'],
  america: ['us-east-1', 'us-west-2', 'sa-east-1'],
  asia: ['ap-southeast-1', 'ap-northeast-1'],
  'asia pacific': ['ap-southeast-1', 'ap-northeast-1'],
  apac: ['ap-southeast-1', 'ap-northeast-1']
});

const SELECTION_REQUIRED_PROMPT =
  'Where should Ugondu deploy this workload? Enter a city, country, or provider region ID—for example Paris, France, Nigeria, South Africa, or eu-west-3. If you are unsure, choose Recommend for me.';
const SELECTION_EXAMPLES = Object.freeze(['Paris', 'France', 'South Africa', 'Nigeria', 'eu-west-3', 'af-south-1']);

const normalizeToken = (val) =>
  String(val || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

function findCatalogueEntry(token) {
  const norm = normalizeToken(token);
  if (!norm) return null;
  return AWS_REGION_CATALOGUE.find((e) =>
    e.id === norm ||
    normalizeToken(e.city) === norm ||
    normalizeToken(e.country) === norm ||
    normalizeToken(e.countryCode) === norm ||
    normalizeToken(e.displayName) === norm ||
    e.aliases.some((a) => normalizeToken(a) === norm)
  ) || null;
}

function evaluatePolicyConflict(entry, options = {}) {
  const policy = options.residencyPolicy || options.policy || {};
  const allowedRegions = policy.allowedRegions || options.allowedRegions;
  const prohibitedRegions = policy.prohibitedRegions || options.prohibitedRegions;
  const allowedCountries = policy.allowedCountries || policy.requiredCountries || options.allowedCountries;
  const allowedGeographies = policy.allowedGeographies || policy.requiredGeography || options.allowedGeographies;

  if (Array.isArray(prohibitedRegions) && prohibitedRegions.includes(entry.id)) {
    return `Region ${entry.id} is explicitly prohibited by residency policy`;
  }
  if (Array.isArray(allowedRegions) && allowedRegions.length > 0 && !allowedRegions.includes(entry.id)) {
    return `Region ${entry.id} is outside policy-approved regions (${allowedRegions.join(', ')})`;
  }
  if (Array.isArray(allowedCountries) && allowedCountries.length > 0) {
    const norms = allowedCountries.map(normalizeToken);
    if (!norms.includes(normalizeToken(entry.country)) && !norms.includes(normalizeToken(entry.countryCode))) {
      return `Region ${entry.id} (${entry.country}) violates country residency requirement (${allowedCountries.join(', ')})`;
    }
  }
  if (allowedGeographies) {
    const geos = (Array.isArray(allowedGeographies) ? allowedGeographies : [allowedGeographies]).map(normalizeToken);
    if (geos.length > 0 && !geos.includes(normalizeToken(entry.geography))) {
      return `Region ${entry.id} (${entry.geography}) violates geography residency requirement (${geos.join(', ')})`;
    }
  }
  return null;
}

const entryFields = (e) => ({
  region: e.id, regions: [e.id], city: e.city, country: e.country, countryCode: e.countryCode, geography: e.geography, displayName: e.displayName
});

function buildRecommendation(entry, source, prompt, extra = {}) {
  return {
    status: 'REQUIRES_CONFIRMATION', decisionState: 'RECOMMENDATION', source, recommendedRegion: entry.id,
    ...entryFields(entry), requiresConfirmation: true, canProvisionWithoutConfirmation: false, rawIpPersisted: false, prompt, ...extra
  };
}

/**
 * Resolves a human-friendly location, region ID, multi-region array, or contextual hint.
 */
export function resolveRegionInput(input, options = {}) {
  if (input && typeof input === 'object' && !Array.isArray(input) && Object.keys(options).length === 0) {
    options = input;
    input = options.userInput ?? options.region ?? options.regions ?? options.input;
  }
  const effectiveInput = input !== undefined && input !== null && String(input).trim() !== ''
    ? input
    : (options.userInput ?? (options.environment && options.environmentRegions ? options.environmentRegions[options.environment] : undefined));

  if (Array.isArray(effectiveInput)) {
    if (effectiveInput.length === 0) return resolveRegionInput(undefined, { ...options, userInput: undefined });
    const resolvedItems = effectiveInput.map((item) => resolveRegionInput(item, { ...options, userInput: undefined }));
    const failed = resolvedItems.find((r) => r.status !== 'RESOLVED');
    if (failed) return { ...failed, regions: [] };
    const regions = [...new Set(resolvedItems.map((r) => r.region))];
    return {
      status: 'RESOLVED', decisionState: 'CONFIRMED', source: 'EXPLICIT_USER_INPUT',
      region: regions[0], primaryRegion: regions[0], secondaryRegions: regions.slice(1),
      regions, resolvedTargets: resolvedItems, requiresConfirmation: false, rawIpPersisted: false
    };
  }

  const rawStr = effectiveInput !== undefined && effectiveInput !== null ? String(effectiveInput).trim() : '';
  if (!rawStr) {
    const audience = Array.isArray(options.audienceGeographies)
      ? options.audienceGeographies
      : options.audienceGeographies ? [options.audienceGeographies] : [];
    for (const geo of audience) {
      const entry = findCatalogueEntry(geo);
      if (entry) {
        return buildRecommendation(
          entry, 'AUDIENCE_GEOGRAPHY',
          `Recommended ${entry.displayName} (${entry.id}) for target audience (${audience.join(', ')}). Confirm to proceed.`,
          { overrodeIpHint: Boolean(options.ipCountryHint) }
        );
      }
    }
    if (options.allowIpHint && options.ipCountryHint) {
      const entry = findCatalogueEntry(options.ipCountryHint);
      if (entry) {
        return buildRecommendation(
          entry, 'IP_COUNTRY_HINT',
          `Recommended ${entry.displayName} (${entry.id}) from coarse country hint (${entry.countryCode}). Confirm to proceed.`,
          { redactedIpHint: options.rawIp ? '[REDACTED]' : undefined }
        );
      }
    }
    return {
      status: 'REGION_SELECTION_REQUIRED', decisionState: 'UNRESOLVED', errorCode: 'UG-REGION-SELECTION-REQUIRED',
      region: null, regions: [], requiresConfirmation: true, rawIpPersisted: false,
      prompt: SELECTION_REQUIRED_PROMPT, examples: [...SELECTION_EXAMPLES]
    };
  }

  const norm = normalizeToken(rawStr);
  if (AMBIGUOUS_GEOGRAPHY_MAP[norm]) {
    const candidateIds = AMBIGUOUS_GEOGRAPHY_MAP[norm];
    const matches = candidateIds
      .map((id) => AWS_REGION_CATALOGUE.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => ({ id: c.id, region: c.id, city: c.city, country: c.country, displayName: c.displayName }));
    return {
      status: 'AMBIGUOUS', decisionState: 'UNRESOLVED', errorCode: 'UG-REGION-AMBIGUOUS',
      input: rawStr, region: null, regions: [], matches, candidateIds, rawIpPersisted: false,
      prompt: `"${rawStr}" spans multiple AWS regions (${matches.map((m) => `${m.displayName} [${m.id}]`).join(', ')}). Please select a specific city, country, or region ID.`
    };
  }

  const entry = findCatalogueEntry(rawStr);
  if (!entry) {
    const alternatives = AWS_REGION_CATALOGUE.slice(0, 4).map((c) => ({
      id: c.id, region: c.id, city: c.city, country: c.country, displayName: c.displayName
    }));
    return {
      status: 'UNSUPPORTED', decisionState: 'UNRESOLVED', errorCode: 'UG-REGION-UNSUPPORTED',
      input: rawStr, region: null, regions: [], matches: [], alternatives, rawIpPersisted: false,
      prompt: `No AWS region is available for "${rawStr}". Supported options include ${alternatives.map((a) => `${a.displayName} (${a.id})`).join(', ')}.`
    };
  }

  const conflict = evaluatePolicyConflict(entry, options);
  if (conflict) {
    return {
      status: 'CONFLICTS_WITH_POLICY', decisionState: 'BLOCKED', errorCode: 'UG-REGION-POLICY-CONFLICT',
      ...entryFields(entry), reason: conflict, rawIpPersisted: false,
      prompt: `Selected region ${entry.displayName} (${entry.id}) conflicts with policy: ${conflict}`
    };
  }

  return {
    status: 'RESOLVED', decisionState: 'CONFIRMED',
    source: options.environment ? 'ENVIRONMENT_CONFIG' : 'EXPLICIT_USER_INPUT',
    environment: options.environment, ...entryFields(entry), requiresConfirmation: false,
    overrodeIpHint: Boolean(options.ipCountryHint && normalizeToken(options.ipCountryHint) !== normalizeToken(entry.countryCode)),
    rawIpPersisted: false
  };
}

export function loadAwsTargetsConfig(customPath) {
  const filePath = customPath || CONFIG_PATH;
  if (!fs.existsSync(filePath)) throw new Error(`AWS target configuration missing at ${filePath}`);
  let config;
  try {
    config = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(`Invalid JSON in AWS target configuration: ${err.message}`);
  }
  if (config.schemaVersion !== '1.0.0') throw new Error(`Unsupported schemaVersion in AWS target config: ${config.schemaVersion}`);
  if (!Array.isArray(config.targets) || config.targets.length === 0) {
    throw new Error('AWS target configuration must declare at least one target definition');
  }
  for (const t of config.targets) {
    if (!t.id || typeof t.id !== 'string') throw new Error('Target entry missing valid string "id"');
    if (!t.accountId || !ACCOUNT_REGEX.test(t.accountId)) throw new Error(`Target ${t.id} has invalid accountId (must be 12 digits): ${t.accountId}`);
    if (!t.region || !REGION_REGEX.test(t.region)) throw new Error(`Target ${t.id} has invalid region format: ${t.region}`);
    if (!t.executionRoleName || typeof t.executionRoleName !== 'string') throw new Error(`Target ${t.id} missing executionRoleName`);
    if (!Array.isArray(t.allowedActions)) throw new Error(`Target ${t.id} missing allowedActions array`);
    if (!t.residualsPolicy || typeof t.residualsPolicy !== 'object') throw new Error(`Target ${t.id} missing residualsPolicy`);
  }
  return config;
}

export function resolveAwsTarget(targetId = process.env.UGONDU_AWS_TARGET_ID, customPath) {
  const { targets } = loadAwsTargetsConfig(customPath);
  if (targetId) {
    const found = targets.find((t) => t.id === targetId);
    if (!found) throw new Error(`AWS target with id "${targetId}" not found in ${customPath || CONFIG_PATH}`);
    return found;
  }
  if (targets.length === 1) return targets[0];
  throw new Error('Multiple AWS targets configured; UGONDU_AWS_TARGET_ID environment variable is required to select target.');
}
