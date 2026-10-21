/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Execution Continuity & Policy Governance
 * File           : UniversalPlacementResolver.ts
 * Version        : 1.1.0
 * Author         : Air Roofers SASU / Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-21
 * Last Modified  : 2026-10-21
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed / Security Reviewed / Architecture Controlled
 * - Protocol Frozen / Modularization Enforced
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53 / UAIGOS 3.0.0
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import * as crypto from 'crypto';

export type PlacementScope = 'organization' | 'project' | 'environment' | 'workload' | 'service';
export type PlacementSource = 'actor-explicit' | 'approved-project-config' | 'policy-required' | 'recommendation-accepted' | 'migration-approved';
export type PlacementStatus = 'RESOLVED' | 'AMBIGUOUS' | 'UNSUPPORTED' | 'CONFLICTS_WITH_POLICY' | 'REQUIRES_CONFIRMATION' | 'UNAVAILABLE' | 'REGION_SELECTION_REQUIRED';
export type PlacementDecisionState = 'ACTOR_SELECTED' | 'APPROVED_CONFIG' | 'RECOMMENDATION' | 'UNRESOLVED';
export type MultiRegionTopologyMode = 'single-region' | 'active-active' | 'active-passive' | 'disaster-recovery' | 'independent';
export type PlacementLocationType = 'region' | 'zone' | 'cluster' | 'datacenter' | 'hosting-location' | 'provider-defined';

export interface PlacementCandidate {
  providerId: string; nativeLocationId: string; displayName: string;
  countryCode?: string; cityOrArea?: string; geography?: string; aliases?: string[];
  locationType: PlacementLocationType; capabilities: string[];
  availability: 'available' | 'restricted' | 'unknown';
  estimatedLatencyMs?: number; latencySource?: 'measured' | 'provider-published' | 'estimated';
  residencyAttributes?: string[]; costTier?: 'low' | 'standard' | 'premium';
  catalogueVersion: string; observedAt: string;
}

export interface ApprovedProjectPlacementConfig {
  providerId: string; tenantRef?: string; projectId: string; environmentId: string;
  workloadId?: string; operation?: string; locations: string[];
  approvedFailoverLocations?: string[]; topologyMode?: MultiRegionTopologyMode;
  approvedBy: string; approvedAt: string; catalogueVersion?: string;
}

export interface IpGeolocationSignal {
  countryCode?: string; cityOrArea?: string; geography?: string; rawIp?: string;
  confidence?: 'low' | 'medium' | 'high';
}

export interface PlacementIntent {
  providerId: string; tenantRef?: string; scope: PlacementScope;
  projectId: string; environmentId: string; workloadId?: string; operation?: string;
  locale?: string; interactive?: boolean; userInput?: string;
  explicitLocationIds?: string[]; environmentLocations?: Record<string, string[]>;
  topologyMode?: MultiRegionTopologyMode; failoverLocationIds?: string[];
  approvedFailoverLocations?: string[]; requiredCapabilities?: string[];
  audienceGeographies?: string[]; residencyRequirements?: string[];
  latencyObjectivesMs?: Record<string, number>;
  allowRecommendation: boolean; allowIpHint: boolean; requireConfirmation: boolean;
  autoApproveRecommendations?: boolean; approvedConfig?: ApprovedProjectPlacementConfig;
  ipSignal?: IpGeolocationSignal;
}

export interface MultiRegionChangeSummary {
  nativeLocationId: string; displayName: string;
  role: 'primary' | 'active-peer' | 'passive-standby' | 'dr-target' | 'independent';
  environmentId: string; plannedAction: 'PROVISION' | 'VALIDATE_FAILOVER' | 'NOOP';
  residencyCompliant: boolean; servicesVerified: boolean;
}

export interface ResolvedPlacement {
  status: PlacementStatus; decisionState: PlacementDecisionState;
  selected: PlacementCandidate[]; alternatives: PlacementCandidate[];
  source?: PlacementSource; topologyMode: MultiRegionTopologyMode;
  rationale: string[]; blockers: string[]; warnings: string[];
  requiresConfirmation: boolean; promptMessage?: string;
  cliExample?: string; configExample?: string;
  regionSummaries?: MultiRegionChangeSummary[];
  planFingerprint?: string; catalogueVersion?: string;
}

export interface PlacementAdapter {
  listLocations(input: { providerId: string; tenantRef: string; requiredCapabilities: string[] }): Promise<PlacementCandidate[]>;
  resolveName(input: { userInput: string; catalogue: PlacementCandidate[]; locale: string }): Promise<{ status: PlacementStatus; matches: PlacementCandidate[]; explanation: string }>;
  validate(input: { intent: PlacementIntent; selected: PlacementCandidate[]; catalogue: PlacementCandidate[] }): Promise<{ status: PlacementStatus; blockers: string[]; warnings: string[] }>;
}

const CAT_VER = '2026.10.21-v1';
const OBS_AT = '2026-10-21T00:00:00.000Z';
const CLOUD_CAPS = ['compute', 'containers', 'iam-regional-condition', 'kms', 'vpc', 'rds', 's3', 'cloudwatch'];
const IPV4_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const IPV6_REGEX = /\b(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}\b/g;

export function redactIpLiterals(input: string, rawIp?: string): string {
  let out = input.replace(IPV4_REGEX, '[REDACTED_IP]').replace(IPV6_REGEX, '[REDACTED_IP]');
  if (rawIp && rawIp.trim().length > 0) out = out.split(rawIp.trim()).join('[REDACTED_IP]');
  return out;
}

function normalizeToken(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function mkLoc(
  providerId: string, nativeLocationId: string, displayName: string, countryCode: string,
  cityOrArea: string, geography: string, aliases: string[], residencyAttributes: string[],
  estimatedLatencyMs: number, costTier: 'low' | 'standard' | 'premium' = 'standard',
  locationType: PlacementLocationType = 'region', capabilities: string[] = CLOUD_CAPS
): PlacementCandidate {
  return {
    providerId, nativeLocationId, displayName, countryCode, cityOrArea, geography, aliases,
    locationType, capabilities, availability: 'available', estimatedLatencyMs,
    latencySource: locationType === 'region' ? 'provider-published' : 'estimated',
    residencyAttributes, costTier, catalogueVersion: CAT_VER, observedAt: OBS_AT,
  };
}

export class AuthoritativeLocationCatalogue {
  private static readonly entries: PlacementCandidate[] = [
    mkLoc('aws', 'eu-west-3', 'Europe (Paris)', 'FR', 'Paris', 'Western Europe', ['paris', 'france', 'western europe', 'europe', 'hexagone'], ['EU', 'EEA', 'GDPR', 'FR', 'EUROPE', 'WESTERN_EUROPE'], 18, 'standard'),
    mkLoc('aws', 'af-south-1', 'Africa (Cape Town)', 'ZA', 'Cape Town', 'Africa', ['cape town', 'south africa', 'africa', 'sub-saharan africa', 'nigeria', 'west africa', 'lagos'], ['AFRICA', 'SUB_SAHARAN_AFRICA', 'ZA'], 42, 'standard'),
    mkLoc('aws', 'eu-central-1', 'Europe (Frankfurt)', 'DE', 'Frankfurt', 'Central Europe', ['frankfurt', 'germany', 'central europe', 'europe'], ['EU', 'EEA', 'GDPR', 'DE', 'EUROPE'], 20, 'standard'),
    mkLoc('aws', 'eu-west-1', 'Europe (Ireland)', 'IE', 'Dublin', 'Western Europe', ['dublin', 'ireland', 'europe'], ['EU', 'EEA', 'GDPR', 'IE', 'EUROPE'], 24, 'low'),
    mkLoc('aws', 'eu-west-2', 'Europe (London)', 'GB', 'London', 'Western Europe', ['london', 'uk', 'united kingdom', 'great britain', 'europe'], ['UK', 'GB', 'EUROPE'], 21, 'standard'),
    mkLoc('aws', 'us-east-1', 'US East (N. Virginia)', 'US', 'Northern Virginia', 'North America', ['northern virginia', 'virginia', 'n. virginia', 'usa', 'united states', 'us', 'north america'], ['US', 'USA', 'NORTH_AMERICA'], 75, 'low'),
    mkLoc('aws', 'us-west-2', 'US West (Oregon)', 'US', 'Oregon', 'North America', ['oregon', 'usa', 'united states', 'us', 'north america'], ['US', 'USA', 'NORTH_AMERICA'], 135, 'low'),
    mkLoc('aws', 'ap-southeast-1', 'Asia Pacific (Singapore)', 'SG', 'Singapore', 'Southeast Asia', ['singapore', 'southeast asia', 'apac', 'asia'], ['APAC', 'SG', 'ASIA'], 160, 'standard'),
    mkLoc('aws', 'ap-northeast-1', 'Asia Pacific (Tokyo)', 'JP', 'Tokyo', 'East Asia', ['tokyo', 'japan', 'east asia', 'apac', 'asia'], ['APAC', 'JP', 'ASIA'], 210, 'standard'),
    mkLoc('aws', 'sa-east-1', 'South America (São Paulo)', 'BR', 'São Paulo', 'South America', ['sao paulo', 'brazil', 'south america', 'latam'], ['LATAM', 'BR', 'SOUTH_AMERICA'], 185, 'premium'),
    mkLoc('gcp', 'europe-west9', 'Europe West 9 (Paris)', 'FR', 'Paris', 'Western Europe', ['paris', 'france', 'western europe', 'europe'], ['EU', 'EEA', 'GDPR', 'FR', 'EUROPE'], 19, 'standard'),
    mkLoc('gcp', 'africa-south1', 'Africa South 1 (Johannesburg)', 'ZA', 'Johannesburg', 'Africa', ['johannesburg', 'south africa', 'africa', 'sub-saharan africa', 'nigeria', 'west africa'], ['AFRICA', 'SUB_SAHARAN_AFRICA', 'ZA'], 45, 'standard'),
    mkLoc('gcp', 'us-east4', 'US East 4 (Northern Virginia)', 'US', 'Virginia', 'North America', ['virginia', 'northern virginia', 'usa', 'united states', 'us'], ['US', 'USA', 'NORTH_AMERICA'], 78, 'low'),
    mkLoc('azure', 'francecentral', 'France Central (Paris)', 'FR', 'Paris', 'Western Europe', ['paris', 'france', 'france central', 'western europe', 'europe'], ['EU', 'EEA', 'GDPR', 'FR', 'EUROPE'], 20, 'standard'),
    mkLoc('azure', 'southafricanorth', 'South Africa North (Johannesburg)', 'ZA', 'Johannesburg', 'Africa', ['johannesburg', 'south africa', 'africa', 'sub-saharan africa', 'nigeria', 'west africa'], ['AFRICA', 'SUB_SAHARAN_AFRICA', 'ZA'], 46, 'standard'),
    mkLoc('azure', 'eastus', 'East US (Virginia)', 'US', 'Virginia', 'North America', ['virginia', 'east us', 'usa', 'united states', 'us'], ['US', 'USA', 'NORTH_AMERICA'], 76, 'low'),
    mkLoc('vps', 'vps-dc-eu-par1', 'VPS Datacenter Paris 1', 'FR', 'Paris', 'Western Europe', ['paris', 'france', 'europe'], ['EU', 'EEA', 'GDPR', 'FR', 'EUROPE'], 22, 'low', 'datacenter', ['compute', 'ssh', 'systemd', 'docker', 'tls']),
    mkLoc('vps', 'vps-dc-af-los1', 'VPS Datacenter Lagos 1', 'NG', 'Lagos', 'West Africa', ['lagos', 'nigeria', 'west africa', 'africa'], ['AFRICA', 'WEST_AFRICA', 'NG'], 25, 'low', 'datacenter', ['compute', 'ssh', 'systemd', 'docker', 'tls']),
    mkLoc('cpanel', 'cpanel-account-host', 'cPanel Managed Hosting Account Target', 'FR', 'Paris', 'Western Europe', ['paris', 'france', 'cpanel-host'], ['EU', 'GDPR', 'FR'], 28, 'low', 'hosting-location', ['web-hosting', 'tls', 'dns-zone', 'mysql']),
    mkLoc('directadmin', 'directadmin-account-host', 'DirectAdmin Hosting Account Target', 'DE', 'Frankfurt', 'Central Europe', ['frankfurt', 'germany', 'directadmin-host'], ['EU', 'GDPR', 'DE'], 26, 'low', 'hosting-location', ['web-hosting', 'tls', 'dns-zone', 'mariadb']),
    mkLoc('private-host', 'private-onprem-dc1', 'Private Sovereign Datacenter 1', 'FR', 'Paris', 'Western Europe', ['paris', 'france', 'on-prem', 'sovereign-dc'], ['EU', 'GDPR', 'FR', 'SOVEREIGN'], 12, 'standard', 'datacenter', ['bare-metal', 'kubernetes', 'ssh', 'airgapped-ready']),
  ];

  public static getLocationsForProvider(providerId: string): PlacementCandidate[] {
    const norm = providerId.trim().toLowerCase();
    return this.entries.filter((c) => c.providerId === norm).map((c) => ({ ...c }));
  }
}

export class DefaultPlacementAdapter implements PlacementAdapter {
  public async listLocations(input: { providerId: string; tenantRef: string; requiredCapabilities: string[] }): Promise<PlacementCandidate[]> {
    return AuthoritativeLocationCatalogue.getLocationsForProvider(input.providerId);
  }

  public async resolveName(input: { userInput: string; catalogue: PlacementCandidate[]; locale: string }): Promise<{ status: PlacementStatus; matches: PlacementCandidate[]; explanation: string }> {
    const q = normalizeToken(input.userInput || '');
    if (!q) return { status: 'REGION_SELECTION_REQUIRED', matches: [], explanation: 'No placement target was supplied.' };

    const exactNative = input.catalogue.filter((c) => normalizeToken(c.nativeLocationId) === q);
    if (exactNative.length === 1) {
      return { status: 'RESOLVED', matches: exactNative, explanation: `Matched provider-native location ID '${exactNative[0].nativeLocationId}' (${exactNative[0].displayName}).` };
    }

    const exactCityOrCountry = input.catalogue.filter(
      (c) => normalizeToken(c.cityOrArea ?? '') === q || normalizeToken(c.countryCode ?? '') === q || normalizeToken(c.displayName) === q
    );
    if (exactCityOrCountry.length === 1) {
      return { status: 'RESOLVED', matches: exactCityOrCountry, explanation: `Resolved '${input.userInput}' to ${exactCityOrCountry[0].nativeLocationId} (${exactCityOrCountry[0].displayName}).` };
    }
    if (exactCityOrCountry.length > 1) {
      const list = exactCityOrCountry.map((c) => `${c.nativeLocationId} (${c.displayName})`).join(', ');
      return { status: 'AMBIGUOUS', matches: exactCityOrCountry, explanation: `Input '${input.userInput}' maps to multiple locations: ${list}. Please select a specific location.` };
    }

    const aliasMatches = input.catalogue.filter((c) => normalizeToken(c.geography ?? '') === q || (c.aliases ?? []).some((a) => normalizeToken(a) === q));
    if (aliasMatches.length === 1) {
      return { status: 'RESOLVED', matches: aliasMatches, explanation: `Resolved '${input.userInput}' to nearest supported provider location ${aliasMatches[0].nativeLocationId} (${aliasMatches[0].displayName}).` };
    }
    if (aliasMatches.length > 1) {
      const list = aliasMatches.map((c) => `${c.nativeLocationId} (${c.displayName})`).join(', ');
      return { status: 'AMBIGUOUS', matches: aliasMatches, explanation: `Input '${input.userInput}' is ambiguous across ${aliasMatches.length} locations: ${list}. Please choose one explicitly.` };
    }

    return { status: 'UNSUPPORTED', matches: [], explanation: `Location '${input.userInput}' is not supported by the selected provider's authoritative catalogue.` };
  }

  public async validate(input: { intent: PlacementIntent; selected: PlacementCandidate[]; catalogue: PlacementCandidate[] }): Promise<{ status: PlacementStatus; blockers: string[]; warnings: string[] }> {
    const blockers: string[] = [];
    const warnings: string[] = [];
    const reqCaps = input.intent.requiredCapabilities ?? [];
    const reqResidency = (input.intent.residencyRequirements ?? []).map((r) => normalizeToken(r));

    for (const cand of input.selected) {
      if (cand.availability !== 'available') blockers.push(`Location '${cand.nativeLocationId}' is currently ${cand.availability}.`);
      for (const cap of reqCaps) {
        if (!cand.capabilities.includes(cap)) blockers.push(`Location '${cand.nativeLocationId}' does not support required capability '${cap}'.`);
      }
      if (reqResidency.length > 0 && !UniversalPlacementResolver.satisfiesResidency(cand, reqResidency)) {
        blockers.push(`Location '${cand.nativeLocationId}' (${cand.countryCode ?? 'unknown'}) conflicts with residency policy [${input.intent.residencyRequirements?.join(', ')}].`);
        return { status: 'CONFLICTS_WITH_POLICY', blockers, warnings };
      }
      if (cand.locationType === 'hosting-location' || cand.locationType === 'datacenter') {
        warnings.push(`Provider '${cand.providerId}' uses placement model '${cand.locationType}' (${cand.nativeLocationId}) rather than cloud regions.`);
      }
    }
    return { status: blockers.length > 0 ? 'UNSUPPORTED' : 'RESOLVED', blockers, warnings };
  }
}

export class UniversalPlacementResolver {
  constructor(private readonly adapter: PlacementAdapter = new DefaultPlacementAdapter()) {}

  public static satisfiesResidency(candidate: PlacementCandidate, reqNormalized: string[]): boolean {
    if (reqNormalized.length === 0) return true;
    const attrs = new Set<string>([
      normalizeToken(candidate.countryCode ?? ''), normalizeToken(candidate.geography ?? ''),
      ...(candidate.residencyAttributes ?? []).map((a) => normalizeToken(a)),
    ]);
    return reqNormalized.every((r) => attrs.has(r));
  }

  public async resolve(intent: PlacementIntent): Promise<ResolvedPlacement> {
    const locale = intent.locale ?? 'en';
    const topologyMode: MultiRegionTopologyMode = intent.topologyMode ?? 'single-region';
    const sanitize = (s: string): string => redactIpLiterals(s, intent.ipSignal?.rawIp);
    const warnings: string[] = [];
    const reqResidency = (intent.residencyRequirements ?? []).map((r) => normalizeToken(r));
    const reqCaps = intent.requiredCapabilities ?? [];

    const catalogue = await this.adapter.listLocations({
      providerId: intent.providerId, tenantRef: intent.tenantRef ?? intent.projectId, requiredCapabilities: reqCaps,
    });

    const fail = (status: PlacementStatus, alternatives: PlacementCandidate[], rationale: string[], blockers: string[]): ResolvedPlacement =>
      this.buildResult(intent, {
        status, decisionState: 'UNRESOLVED', selected: [], alternatives, topologyMode,
        rationale: rationale.map(sanitize), blockers: blockers.map(sanitize), warnings: warnings.map(sanitize), requiresConfirmation: true,
      });

    if (catalogue.length === 0) {
      return fail('UNAVAILABLE', [], ['Provider location catalogue is empty or unavailable.'], [`No authoritative locations available for provider '${intent.providerId}'.`]);
    }

    const compliantCatalogue = catalogue.filter(
      (c) => c.availability === 'available' && reqCaps.every((cap) => c.capabilities.includes(cap)) && UniversalPlacementResolver.satisfiesResidency(c, reqResidency)
    );

    // Priority 2: Explicit Actor Selection (checked against Priority 1 Residency & Policy)
    const envSpecific = intent.environmentLocations?.[intent.environmentId];
    const explicitInputs = envSpecific?.length ? envSpecific : intent.explicitLocationIds?.length ? intent.explicitLocationIds : intent.userInput !== undefined ? [intent.userInput] : [];
    const nonBlankExplicit = explicitInputs.map((x) => x.trim()).filter((x) => x.length > 0);

    if (nonBlankExplicit.length > 0) {
      const selected: PlacementCandidate[] = [];
      const rationale: string[] = [];
      for (const rawInput of nonBlankExplicit) {
        const res = await this.adapter.resolveName({ userInput: rawInput, catalogue, locale });
        if (res.status === 'AMBIGUOUS') return fail('AMBIGUOUS', res.matches, [res.explanation], [res.explanation]);
        if (res.status !== 'RESOLVED' || res.matches.length === 0) return fail('UNSUPPORTED', compliantCatalogue, [res.explanation], [res.explanation]);
        selected.push(res.matches[0]);
        rationale.push(sanitize(res.explanation));
      }

      const failoverCheck = await this.validateFailoverLocations(intent, selected, catalogue, locale);
      if (!failoverCheck.valid) return fail('CONFLICTS_WITH_POLICY', compliantCatalogue, rationale, failoverCheck.blockers);
      selected.push(...failoverCheck.failoverCandidates);

      const val = await this.adapter.validate({ intent, selected, catalogue });
      warnings.push(...val.warnings.map(sanitize));
      if (val.status !== 'RESOLVED') return fail(val.status, compliantCatalogue, rationale, val.blockers);

      if (intent.ipSignal?.countryCode && selected.some((s) => normalizeToken(s.countryCode ?? '') !== normalizeToken(intent.ipSignal!.countryCode!))) {
        rationale.push('Explicit actor selection honored over approximate IP-geolocation signal.');
      }

      const effectiveTopo: MultiRegionTopologyMode = selected.length > 1 && topologyMode === 'single-region' ? 'active-active' : topologyMode;
      return this.buildResult(intent, {
        status: 'RESOLVED', decisionState: 'ACTOR_SELECTED', selected,
        alternatives: compliantCatalogue.filter((c) => !selected.some((s) => s.nativeLocationId === c.nativeLocationId)),
        source: 'actor-explicit', topologyMode: effectiveTopo, rationale, blockers: [], warnings, requiresConfirmation: intent.requireConfirmation,
      });
    }

    // Priority 3: Valid Approved Project/Environment Configuration
    if (intent.approvedConfig) {
      const cfg = intent.approvedConfig;
      const scopeMatches =
        cfg.providerId.toLowerCase() === intent.providerId.toLowerCase() && cfg.projectId === intent.projectId &&
        cfg.environmentId === intent.environmentId && (cfg.workloadId ?? '') === (intent.workloadId ?? '') &&
        (!cfg.tenantRef || !intent.tenantRef || cfg.tenantRef === intent.tenantRef) &&
        (!cfg.operation || !intent.operation || cfg.operation === intent.operation);
      const catalogueFresh = !cfg.catalogueVersion || cfg.catalogueVersion === catalogue[0]?.catalogueVersion;

      if (!scopeMatches) {
        warnings.push('Ignored approved placement configuration because provider, project, environment, or workload scope did not match.');
      } else if (!catalogueFresh) {
        warnings.push('Invalidated approved placement configuration because catalogue version changed; re-planning required.');
      } else if (cfg.locations.length > 0) {
        const cfgCandidates = cfg.locations.map((locId) => catalogue.find((c) => normalizeToken(c.nativeLocationId) === normalizeToken(locId))).filter((c): c is PlacementCandidate => Boolean(c));
        if (cfgCandidates.length === cfg.locations.length) {
          const val = await this.adapter.validate({ intent, selected: cfgCandidates, catalogue });
          if (val.status === 'RESOLVED') {
            return this.buildResult(intent, {
              status: 'RESOLVED', decisionState: 'APPROVED_CONFIG', selected: cfgCandidates,
              alternatives: compliantCatalogue.filter((c) => !cfgCandidates.some((s) => s.nativeLocationId === c.nativeLocationId)),
              source: 'approved-project-config', topologyMode: cfg.topologyMode ?? (cfgCandidates.length > 1 ? 'active-active' : topologyMode),
              rationale: [`Reused validated approved configuration for project '${intent.projectId}' (${intent.environmentId}).`],
              blockers: [], warnings: [...warnings, ...val.warnings], requiresConfirmation: false,
            });
          }
          return fail(val.status, compliantCatalogue, ['Approved project configuration conflicts with active policy or capability constraints.'], val.blockers);
        }
      }
    }

    if (reqResidency.length > 0 && compliantCatalogue.length === 0) {
      return fail('CONFLICTS_WITH_POLICY', [], ['No provider locations satisfy the required residency constraints.'], [`Residency policy [${intent.residencyRequirements?.join(', ')}] cannot be satisfied on provider '${intent.providerId}'.`]);
    }

    // Priorities 4, 5, 6: Advisory Recommendation Engine
    if (intent.allowRecommendation) {
      let pool = [...compliantCatalogue];
      const rationale: string[] = [];
      let triggered = false;

      const audiences = (intent.audienceGeographies ?? []).map((a) => normalizeToken(a)).filter(Boolean);
      if (audiences.length > 0) {
        const audMatches = pool.filter((c) => this.matchesGeographyTokens(c, audiences));
        if (audMatches.length === 0) {
          return fail(reqResidency.length > 0 ? 'CONFLICTS_WITH_POLICY' : 'UNSUPPORTED', compliantCatalogue, [`No compliant locations match declared audience geographies [${intent.audienceGeographies?.join(', ')}].`], [`Unable to satisfy declared audience geographies [${intent.audienceGeographies?.join(', ')}] within current constraints.`]);
        }
        pool = audMatches;
        triggered = true;
        rationale.push(`Prioritized declared customer/audience geography [${intent.audienceGeographies?.join(', ')}].`);
      }

      const latencyThresholds = Object.values(intent.latencyObjectivesMs ?? {});
      if (latencyThresholds.length > 0) {
        const maxLat = Math.min(...latencyThresholds);
        const latMatches = pool.filter((c) => (c.estimatedLatencyMs ?? 9999) <= maxLat);
        if (latMatches.length === 0) {
          return fail('UNAVAILABLE', compliantCatalogue, [`No candidate met maximum latency objective of ${maxLat}ms.`], [`Latency objective <= ${maxLat}ms cannot be satisfied by available locations.`]);
        }
        pool = latMatches;
        triggered = true;
        rationale.push(`Filtered candidates by maximum latency objective (<= ${maxLat}ms).`);
      }

      if (reqResidency.length > 0) {
        triggered = true;
        rationale.push(`Enforced data residency constraints [${intent.residencyRequirements?.join(', ')}].`);
      }

      if (!audiences.length && intent.ipSignal) {
        if (intent.allowIpHint) {
          const ipTokens = [intent.ipSignal.cityOrArea, intent.ipSignal.countryCode, intent.ipSignal.geography].filter((x): x is string => Boolean(x)).map((x) => normalizeToken(x));
          const ipMatches = pool.filter((c) => this.matchesGeographyTokens(c, ipTokens));
          if (ipMatches.length > 0) {
            pool = ipMatches;
            triggered = true;
            rationale.push('Applied permissioned approximate location hint (advisory only; raw IP redacted and never persisted).');
          }
        } else {
          warnings.push('Ignored IP-geolocation signal because allowIpHint is disabled by privacy configuration.');
        }
      }

      if (triggered && pool.length > 0) {
        const costWeight: Record<string, number> = { low: 1, standard: 2, premium: 3 };
        pool.sort((a, b) => ((a.estimatedLatencyMs ?? 999) - (b.estimatedLatencyMs ?? 999)) || ((costWeight[a.costTier ?? 'standard'] ?? 2) - (costWeight[b.costTier ?? 'standard'] ?? 2)));
        const best = pool[0];
        const autoApprove = Boolean(intent.autoApproveRecommendations && !intent.requireConfirmation);
        rationale.push(`Recommended '${best.nativeLocationId}' (${best.displayName}) based on latency/cost/service fit.`);

        return this.buildResult(intent, {
          status: autoApprove ? 'RESOLVED' : 'REQUIRES_CONFIRMATION', decisionState: 'RECOMMENDATION',
          selected: [best], alternatives: compliantCatalogue.filter((c) => c.nativeLocationId !== best.nativeLocationId),
          source: autoApprove ? 'recommendation-accepted' : undefined, topologyMode,
          rationale: rationale.map(sanitize), blockers: [], warnings: warnings.map(sanitize), requiresConfirmation: !autoApprove,
        });
      }
    }

    // Priority 7: Unresolved — ask actor, never silently fall back
    return this.buildResult(intent, {
      status: 'REGION_SELECTION_REQUIRED', decisionState: 'UNRESOLVED', selected: [], alternatives: compliantCatalogue, topologyMode,
      rationale: ['No explicit target, valid approved configuration, or authorized recommendation criteria resolved a location.'],
      blockers: ['Deployment target region/location is required before policy rendering or resource mutation.'],
      warnings: warnings.map(sanitize), requiresConfirmation: true,
      promptMessage: 'Where should Ugondu deploy this workload? Enter a city, country, or provider region ID—for example Paris, France, Nigeria, South Africa, or eu-west-3. If you are unsure, choose Recommend for me. Ugondu will compare supported locations against your customers, latency, cost, data-residency rules, and required services before proposing a target.',
      cliExample: `ugondu deploy --provider ${intent.providerId} --project ${intent.projectId} --env ${intent.environmentId} --region <Paris|France|Nigeria|South Africa|eu-west-3>`,
      configExample: `apiVersion: ugondu.dev/v1\nkind: DeploymentPlacement\nmetadata:\n  project: ${intent.projectId}\n  environment: ${intent.environmentId}\nspec:\n  provider: ${intent.providerId}\n  selection:\n    mode: explicit\n    locations:\n      - id: <actor-selected-native-location-id>`,
    });
  }

  private matchesGeographyTokens(c: PlacementCandidate, tokens: string[]): boolean {
    const candidateTokens = new Set<string>([
      normalizeToken(c.nativeLocationId), normalizeToken(c.cityOrArea ?? ''), normalizeToken(c.countryCode ?? ''),
      normalizeToken(c.geography ?? ''), ...(c.aliases ?? []).map((a) => normalizeToken(a)), ...(c.residencyAttributes ?? []).map((r) => normalizeToken(r)),
    ]);
    return tokens.some((t) => candidateTokens.has(t));
  }

  private async validateFailoverLocations(
    intent: PlacementIntent, primarySelected: PlacementCandidate[], catalogue: PlacementCandidate[], locale: string
  ): Promise<{ valid: boolean; failoverCandidates: PlacementCandidate[]; blockers: string[] }> {
    const blockers: string[] = [];
    const failoverCandidates: PlacementCandidate[] = [];
    const approvedSet = new Set((intent.approvedFailoverLocations ?? intent.approvedConfig?.approvedFailoverLocations ?? []).map((x) => normalizeToken(x)));
    if ((intent.topologyMode === 'active-passive' || intent.topologyMode === 'disaster-recovery') && primarySelected.length > 1 && approvedSet.size > 0) {
      for (const secondary of primarySelected.slice(1)) {
        if (!approvedSet.has(normalizeToken(secondary.nativeLocationId))) blockers.push(`Secondary failover location '${secondary.nativeLocationId}' is not in approvedFailoverLocations.`);
      }
    }
    for (const rawFailover of intent.failoverLocationIds ?? []) {
      const res = await this.adapter.resolveName({ userInput: rawFailover, catalogue, locale });
      if (res.status !== 'RESOLVED' || res.matches.length === 0) blockers.push(`Failover location '${rawFailover}' could not be uniquely resolved.`);
      else if (!approvedSet.has(normalizeToken(res.matches[0].nativeLocationId))) blockers.push(`Failover location '${res.matches[0].nativeLocationId}' is not pre-approved in approvedFailoverLocations.`);
      else failoverCandidates.push(res.matches[0]);
    }
    return { valid: blockers.length === 0, failoverCandidates, blockers };
  }

  private buildResult(intent: PlacementIntent, partial: Omit<ResolvedPlacement, 'planFingerprint' | 'catalogueVersion' | 'regionSummaries'>): ResolvedPlacement {
    const catVer = partial.selected[0]?.catalogueVersion ?? partial.alternatives[0]?.catalogueVersion ?? CAT_VER;
    const regionSummaries: MultiRegionChangeSummary[] = partial.selected.map((c, idx) => ({
      nativeLocationId: c.nativeLocationId, displayName: c.displayName,
      role: partial.topologyMode === 'single-region' ? 'primary' : partial.topologyMode === 'active-active' ? (idx === 0 ? 'primary' : 'active-peer') : partial.topologyMode === 'active-passive' ? (idx === 0 ? 'primary' : 'passive-standby') : partial.topologyMode === 'disaster-recovery' ? (idx === 0 ? 'primary' : 'dr-target') : 'independent',
      environmentId: intent.environmentId, plannedAction: idx === 0 || partial.topologyMode === 'active-active' ? 'PROVISION' : 'VALIDATE_FAILOVER',
      residencyCompliant: UniversalPlacementResolver.satisfiesResidency(c, (intent.residencyRequirements ?? []).map((r) => normalizeToken(r))),
      servicesVerified: c.availability === 'available',
    }));
    const fingerprintPayload = JSON.stringify({
      providerId: intent.providerId, scope: intent.scope, projectId: intent.projectId, environmentId: intent.environmentId,
      workloadId: intent.workloadId ?? '', status: partial.status, decisionState: partial.decisionState,
      source: partial.source ?? 'none', topologyMode: partial.topologyMode, selectedIds: partial.selected.map((s) => s.nativeLocationId), catalogueVersion: catVer,
    });
    const planFingerprint = crypto.createHash('sha256').update(fingerprintPayload, 'utf8').digest('hex');
    return { ...partial, regionSummaries, planFingerprint, catalogueVersion: catVer };
  }
}
