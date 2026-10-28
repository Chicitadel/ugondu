/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Execution Continuity & Policy Governance
 * File           : UniversalPlacementResolver.ts
 * Version        : 1.3.0
 * Author         : Air Roofers SASU / Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-21
 * Last Modified  : 2026-10-22
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
import {
  DynamicLocationCatalogueProvider, ILocationCatalogueProvider, LocationCatalogueProvenance,
  LocationCatalogueResult, PlacementCandidate, PlacementLocationType,
} from './LocationCatalogueProvider';

export {
  DynamicLocationCatalogueProvider, ILocationCatalogueProvider, LocationCatalogueProvenance,
  LocationCatalogueResult, PlacementCandidate, PlacementLocationType,
};

export type PlacementScope = 'organization' | 'project' | 'environment' | 'workload' | 'service';
export type PlacementSource = 'actor-explicit' | 'approved-project-config' | 'policy-required' | 'recommendation-accepted' | 'migration-approved';
export type PlacementStatus = 'RESOLVED' | 'AMBIGUOUS' | 'UNSUPPORTED' | 'CONFLICTS_WITH_POLICY' | 'REQUIRES_CONFIRMATION' | 'UNAVAILABLE' | 'REGION_SELECTION_REQUIRED';
export type PlacementDecisionState = 'ACTOR_SELECTED' | 'APPROVED_CONFIG' | 'RECOMMENDATION' | 'UNRESOLVED';
export type MultiRegionTopologyMode = 'single-region' | 'active-active' | 'active-passive' | 'disaster-recovery' | 'independent';

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
  ipSignal?: IpGeolocationSignal; throwOnError?: boolean;
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

export interface PlacementInput {
  providerId: string; region?: string; regionName?: string; city?: string; country?: string;
  userInput?: string; residencyRequirements?: string[]; requiredCapabilities?: string[];
  tenantRef?: string; environmentId?: string; projectId?: string;
}

export interface PlacementActor {
  actorId?: string; tenantRef?: string; allowedRegions?: string[]; disallowedRegions?: string[];
}

export class PlacementInputRequiredError extends Error {
  public readonly code = 'REGION_SELECTION_REQUIRED';
  public readonly token: string; public readonly examples: string[];
  constructor(options?: { token?: string; examples?: string[]; message?: string } | string) {
    const opts = typeof options === 'string' ? { message: options } : options;
    const examples = opts?.examples ?? ['eu-west-3', 'Paris', 'France'];
    super(opts?.message ?? `REGION_SELECTION_REQUIRED: Placement target is required. Examples: ${examples.join(', ')}`);
    this.name = 'PlacementInputRequiredError';
    this.token = opts?.token ?? 'placement.region_required';
    this.examples = examples;
  }
}

export class PlacementClarificationRequiredError extends Error {
  public readonly code = 'AMBIGUOUS';
  constructor(public readonly candidates: PlacementCandidate[], message?: string) {
    super(message ?? `AMBIGUOUS: Input maps to multiple locations: ${candidates.map((c) => `${c.nativeLocationId} (${c.displayName})`).join(', ')}. Please choose one explicitly.`);
    this.name = 'PlacementClarificationRequiredError';
  }
}

export class NoPermittedPlacementError extends Error {
  public readonly code = 'CONFLICTS_WITH_POLICY';
  constructor(public readonly violations: string[] = ['Placement conflicts with active policy or data residency requirements.'], message?: string) {
    super(message ?? `CONFLICTS_WITH_POLICY: ${violations.join('; ')}`);
    this.name = 'NoPermittedPlacementError';
  }
}
export { NoPermittedPlacementError as PlacementPolicyConflictError };

export class PlacementUnsupportedError extends Error {
  public readonly code = 'UNSUPPORTED';
  constructor(public readonly blockers: string[] = ['Location is unsupported.'], message?: string) {
    super(message ?? `UNSUPPORTED: ${blockers.join('; ')}`);
    this.name = 'PlacementUnsupportedError';
  }
}

export class PlacementUnavailableError extends Error {
  public readonly code = 'UNAVAILABLE';
  constructor(public readonly blockers: string[] = ['Location catalogue is unavailable.'], message?: string) {
    super(message ?? `UNAVAILABLE: ${blockers.join('; ')}`);
    this.name = 'PlacementUnavailableError';
  }
}

export interface PlacementAdapter {
  listLocations(input: { providerId: string; tenantRef: string; requiredCapabilities: string[] }): Promise<PlacementCandidate[]>;
  resolveName(input: { userInput: string; catalogue: PlacementCandidate[]; locale: string }): Promise<{ status: PlacementStatus; matches: PlacementCandidate[]; explanation: string }>;
  validate(input: { intent: PlacementIntent; selected: PlacementCandidate[]; catalogue: PlacementCandidate[] }): Promise<{ status: PlacementStatus; blockers: string[]; warnings: string[] }>;
}

const IPV4_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const IPV6_REGEX = /\b(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}\b/g;
export function redactIpLiterals(input: string, rawIp?: string): string {
  let out = input.replace(IPV4_REGEX, '[REDACTED_IP]').replace(IPV6_REGEX, '[REDACTED_IP]');
  return (rawIp && rawIp.trim().length > 0) ? out.split(rawIp.trim()).join('[REDACTED_IP]') : out;
}
function normalizeToken(v: string): string {
  return v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

export class AuthoritativeLocationCatalogue {
  public static async getLocationsForProvider(providerId: string): Promise<PlacementCandidate[]> {
    return (await DynamicLocationCatalogueProvider.getInstance().fetchLocations(providerId)).locations;
  }
  public static getSeedLocationsForProvider(providerId: string): PlacementCandidate[] {
    return DynamicLocationCatalogueProvider.getInstance().getSeedLocations(providerId);
  }
}

export class DefaultPlacementAdapter implements PlacementAdapter {
  constructor(private readonly catalogueProvider: ILocationCatalogueProvider = DynamicLocationCatalogueProvider.getInstance()) {}
  public async listLocations(input: { providerId: string; tenantRef: string; requiredCapabilities: string[] }): Promise<PlacementCandidate[]> {
    return (await this.catalogueProvider.fetchLocations(input.providerId)).locations;
  }
  public async resolveName(input: { userInput: string; catalogue: PlacementCandidate[]; locale: string }): Promise<{ status: PlacementStatus; matches: PlacementCandidate[]; explanation: string }> {
    const q = normalizeToken(input.userInput || '');
    if (!q) return { status: 'REGION_SELECTION_REQUIRED', matches: [], explanation: 'No placement target was supplied.' };
    const exact = input.catalogue.filter((c) => normalizeToken(c.nativeLocationId) === q);
    if (exact.length === 1) return { status: 'RESOLVED', matches: exact, explanation: `Matched provider-native location ID '${exact[0].nativeLocationId}' (${exact[0].displayName}).` };
    const cityCountry = input.catalogue.filter((c) => normalizeToken(c.cityOrArea ?? '') === q || normalizeToken(c.countryCode ?? '') === q || normalizeToken(c.displayName) === q);
    if (cityCountry.length === 1) return { status: 'RESOLVED', matches: cityCountry, explanation: `Resolved '${input.userInput}' to ${cityCountry[0].nativeLocationId} (${cityCountry[0].displayName}).` };
    if (cityCountry.length > 1) return { status: 'AMBIGUOUS', matches: cityCountry, explanation: `Input '${input.userInput}' maps to multiple locations: ${cityCountry.map((c) => `${c.nativeLocationId} (${c.displayName})`).join(', ')}. Please select a specific location.` };
    const aliases = input.catalogue.filter((c) => normalizeToken(c.geography ?? '') === q || (c.aliases ?? []).some((a) => normalizeToken(a) === q));
    if (aliases.length === 1) return { status: 'RESOLVED', matches: aliases, explanation: `Resolved '${input.userInput}' to nearest supported provider location ${aliases[0].nativeLocationId} (${aliases[0].displayName}).` };
    if (aliases.length > 1) return { status: 'AMBIGUOUS', matches: aliases, explanation: `Input '${input.userInput}' is ambiguous across ${aliases.length} locations: ${aliases.map((c) => `${c.nativeLocationId} (${c.displayName})`).join(', ')}. Please choose one explicitly.` };
    return { status: 'UNSUPPORTED', matches: [], explanation: `Location '${input.userInput}' is not supported by the selected provider's authoritative catalogue.` };
  }
  public async validate(input: { intent: PlacementIntent; selected: PlacementCandidate[]; catalogue: PlacementCandidate[] }): Promise<{ status: PlacementStatus; blockers: string[]; warnings: string[] }> {
    const blockers: string[] = [], warnings: string[] = [], reqCaps = input.intent.requiredCapabilities ?? [], reqRes = (input.intent.residencyRequirements ?? []).map((r) => normalizeToken(r));
    for (const cand of input.selected) {
      if (cand.availability !== 'available') blockers.push(`Location '${cand.nativeLocationId}' is currently ${cand.availability}.`);
      for (const cap of reqCaps) { if (!cand.capabilities.includes(cap)) blockers.push(`Location '${cand.nativeLocationId}' does not support required capability '${cap}'.`); }
      if (reqRes.length > 0 && !UniversalPlacementResolver.satisfiesResidency(cand, reqRes)) {
        blockers.push(`Location '${cand.nativeLocationId}' (${cand.countryCode ?? 'unknown'}) conflicts with residency policy [${input.intent.residencyRequirements?.join(', ')}].`);
        return { status: 'CONFLICTS_WITH_POLICY', blockers, warnings };
      }
      if (cand.locationType === 'hosting-location' || cand.locationType === 'datacenter') warnings.push(`Provider '${cand.providerId}' uses placement model '${cand.locationType}' (${cand.nativeLocationId}) rather than cloud regions.`);
    }
    return { status: blockers.length > 0 ? 'UNSUPPORTED' : 'RESOLVED', blockers, warnings };
  }
}

export class UniversalPlacementResolver {
  constructor(private readonly adapter: PlacementAdapter = new DefaultPlacementAdapter()) {}
  public static satisfiesResidency(cand: PlacementCandidate, reqNorm: string[]): boolean {
    if (reqNorm.length === 0) return true;
    const s = new Set<string>([normalizeToken(cand.countryCode ?? ''), normalizeToken(cand.geography ?? ''), ...(cand.residencyAttributes ?? []).map((a) => normalizeToken(a))]);
    return reqNorm.every((r) => s.has(r));
  }
  public async resolvePlacementTarget(input: PlacementInput, actor?: PlacementActor): Promise<PlacementCandidate> {
    const raw = input.region || input.regionName || input.city || input.country || input.userInput;
    if (!raw || !raw.trim()) throw new PlacementInputRequiredError({ token: 'placement.region_required', examples: ['eu-west-3', 'Paris', 'France'] });
    const cat = await this.adapter.listLocations({ providerId: input.providerId, tenantRef: input.tenantRef ?? input.projectId ?? 'default', requiredCapabilities: input.requiredCapabilities ?? [] });
    if (cat.length === 0) throw new PlacementUnavailableError([`No authoritative locations available for provider '${input.providerId}'.`]);
    const res = await this.adapter.resolveName({ userInput: raw.trim(), catalogue: cat, locale: 'en' });
    if (res.status === 'AMBIGUOUS' || res.matches.length > 1) throw new PlacementClarificationRequiredError(res.matches);
    if (res.status !== 'RESOLVED' || res.matches.length === 0) throw new PlacementUnsupportedError([res.explanation]);
    const target = res.matches[0], reqRes = (input.residencyRequirements ?? []).map((r) => normalizeToken(r));
    if (reqRes.length > 0 && !UniversalPlacementResolver.satisfiesResidency(target, reqRes)) {
      throw new NoPermittedPlacementError([`Location '${target.nativeLocationId}' (${target.countryCode ?? 'unknown'}) conflicts with residency policy [${input.residencyRequirements?.join(', ')}].`]);
    }
    if (actor?.allowedRegions?.length && !actor.allowedRegions.includes(target.nativeLocationId)) throw new NoPermittedPlacementError([`Location '${target.nativeLocationId}' is not permitted by actor policy.`]);
    if (actor?.disallowedRegions?.includes(target.nativeLocationId)) throw new NoPermittedPlacementError([`Location '${target.nativeLocationId}' is prohibited by actor policy.`]);
    return target;
  }

  public async resolve(intent: PlacementIntent): Promise<ResolvedPlacement> {
    const locale = intent.locale ?? 'en', topo: MultiRegionTopologyMode = intent.topologyMode ?? 'single-region';
    const sanitize = (s: string): string => redactIpLiterals(s, intent.ipSignal?.rawIp);
    const warnings: string[] = [], reqRes = (intent.residencyRequirements ?? []).map((r) => normalizeToken(r)), reqCaps = intent.requiredCapabilities ?? [];
    const cat = await this.adapter.listLocations({ providerId: intent.providerId, tenantRef: intent.tenantRef ?? intent.projectId, requiredCapabilities: reqCaps });
    const catVer = cat[0]?.catalogueVersion;
    const fail = (status: PlacementStatus, alternatives: PlacementCandidate[], rationale: string[], blockers: string[]): ResolvedPlacement => {
      const res = this.buildResult(intent, {
        status, decisionState: 'UNRESOLVED', selected: [], alternatives, topologyMode: topo,
        rationale: rationale.map(sanitize), blockers: blockers.map(sanitize), warnings: warnings.map(sanitize), requiresConfirmation: true,
      }, catVer);
      if (intent.throwOnError) {
        if (status === 'REGION_SELECTION_REQUIRED') throw new PlacementInputRequiredError();
        if (status === 'AMBIGUOUS') throw new PlacementClarificationRequiredError(alternatives);
        if (status === 'CONFLICTS_WITH_POLICY') throw new NoPermittedPlacementError(blockers);
        if (status === 'UNAVAILABLE') throw new PlacementUnavailableError(blockers);
        if (status === 'UNSUPPORTED') throw new PlacementUnsupportedError(blockers);
      }
      return res;
    };
    if (cat.length === 0) return fail('UNAVAILABLE', [], ['Provider location catalogue is empty or unavailable.'], [`No authoritative locations available for provider '${intent.providerId}'.`]);
    const compliant = cat.filter((c) => c.availability === 'available' && reqCaps.every((cap) => c.capabilities.includes(cap)) && UniversalPlacementResolver.satisfiesResidency(c, reqRes));
    const envLocs = intent.environmentLocations?.[intent.environmentId];
    const rawInputs = (envLocs?.length ? envLocs : intent.explicitLocationIds?.length ? intent.explicitLocationIds : intent.userInput !== undefined ? [intent.userInput] : []).map((x) => x.trim()).filter((x) => x.length > 0);

    if (rawInputs.length > 0) {
      const selected: PlacementCandidate[] = [], rationale: string[] = [];
      for (const raw of rawInputs) {
        const res = await this.adapter.resolveName({ userInput: raw, catalogue: cat, locale });
        if (res.status === 'AMBIGUOUS') return fail('AMBIGUOUS', res.matches, [res.explanation], [res.explanation]);
        if (res.status !== 'RESOLVED' || res.matches.length === 0) return fail('UNSUPPORTED', compliant, [res.explanation], [res.explanation]);
        selected.push(res.matches[0]); rationale.push(sanitize(res.explanation));
      }
      const failoverCheck = await this.validateFailover(intent, selected, cat, locale);
      if (!failoverCheck.valid) return fail('CONFLICTS_WITH_POLICY', compliant, rationale, failoverCheck.blockers);
      selected.push(...failoverCheck.candidates);
      const val = await this.adapter.validate({ intent, selected, catalogue: cat });
      warnings.push(...val.warnings.map(sanitize));
      if (val.status !== 'RESOLVED') return fail(val.status, compliant, rationale, val.blockers);
      if (intent.ipSignal?.countryCode && selected.some((s) => normalizeToken(s.countryCode ?? '') !== normalizeToken(intent.ipSignal!.countryCode!))) {
        rationale.push('Explicit actor selection honored over approximate IP-geolocation signal.');
      }
      return this.buildResult(intent, {
        status: 'RESOLVED', decisionState: 'ACTOR_SELECTED', selected,
        alternatives: compliant.filter((c) => !selected.some((s) => s.nativeLocationId === c.nativeLocationId)),
        source: 'actor-explicit', topologyMode: selected.length > 1 && topo === 'single-region' ? 'active-active' : topo,
        rationale, blockers: [], warnings, requiresConfirmation: intent.requireConfirmation,
      }, catVer);
    }

    if (intent.approvedConfig) {
      const cfg = intent.approvedConfig;
      const matches = cfg.providerId.toLowerCase() === intent.providerId.toLowerCase() && cfg.projectId === intent.projectId &&
        cfg.environmentId === intent.environmentId && (cfg.workloadId ?? '') === (intent.workloadId ?? '') &&
        (!cfg.tenantRef || !intent.tenantRef || cfg.tenantRef === intent.tenantRef) && (!cfg.operation || !intent.operation || cfg.operation === intent.operation);
      const fresh = !cfg.catalogueVersion || cfg.catalogueVersion === catVer;
      if (!matches) warnings.push('Ignored approved placement configuration because provider, project, environment, or workload scope did not match.');
      else if (!fresh) warnings.push('Invalidated approved placement configuration because catalogue version changed; re-planning required.');
      else if (cfg.locations.length > 0) {
        const cands = cfg.locations.map((loc) => cat.find((c) => normalizeToken(c.nativeLocationId) === normalizeToken(loc))).filter((c): c is PlacementCandidate => Boolean(c));
        if (cands.length === cfg.locations.length) {
          const val = await this.adapter.validate({ intent, selected: cands, catalogue: cat });
          if (val.status === 'RESOLVED') {
            return this.buildResult(intent, {
              status: 'RESOLVED', decisionState: 'APPROVED_CONFIG', selected: cands,
              alternatives: compliant.filter((c) => !cands.some((s) => s.nativeLocationId === c.nativeLocationId)),
              source: 'approved-project-config', topologyMode: cfg.topologyMode ?? (cands.length > 1 ? 'active-active' : topo),
              rationale: [`Reused validated approved configuration for project '${intent.projectId}' (${intent.environmentId}).`],
              blockers: [], warnings: [...warnings, ...val.warnings], requiresConfirmation: false,
            }, catVer);
          }
          return fail(val.status, compliant, ['Approved project configuration conflicts with active policy or capability constraints.'], val.blockers);
        }
      }
    }

    if (reqRes.length > 0 && compliant.length === 0) {
      return fail('CONFLICTS_WITH_POLICY', [], ['No provider locations satisfy the required residency constraints.'], [`Residency policy [${intent.residencyRequirements?.join(', ')}] cannot be satisfied on provider '${intent.providerId}'.`]);
    }

    if (intent.allowRecommendation) {
      let pool = [...compliant]; const rationale: string[] = []; let triggered = false;
      const audiences = (intent.audienceGeographies ?? []).map((a) => normalizeToken(a)).filter(Boolean);
      if (audiences.length > 0) {
        const matches = pool.filter((c) => this.matchesGeo(c, audiences));
        if (matches.length === 0) return fail(reqRes.length > 0 ? 'CONFLICTS_WITH_POLICY' : 'UNSUPPORTED', compliant, [`No compliant locations match declared audience geographies [${intent.audienceGeographies?.join(', ')}].`], [`Unable to satisfy declared audience geographies [${intent.audienceGeographies?.join(', ')}] within current constraints.`]);
        pool = matches; triggered = true; rationale.push(`Prioritized declared customer/audience geography [${intent.audienceGeographies?.join(', ')}].`);
      }
      const latThresholds = Object.values(intent.latencyObjectivesMs ?? {});
      if (latThresholds.length > 0) {
        const maxLat = Math.min(...latThresholds);
        const latMatches = pool.filter((c) => (c.estimatedLatencyMs ?? 9999) <= maxLat);
        if (latMatches.length === 0) return fail('UNAVAILABLE', compliant, [`No candidate met maximum latency objective of ${maxLat}ms.`], [`Latency objective <= ${maxLat}ms cannot be satisfied by available locations.`]);
        pool = latMatches; triggered = true; rationale.push(`Filtered candidates by maximum latency objective (<= ${maxLat}ms).`);
      }
      if (reqRes.length > 0) { triggered = true; rationale.push(`Enforced data residency constraints [${intent.residencyRequirements?.join(', ')}].`); }
      if (!audiences.length && intent.ipSignal) {
        if (intent.allowIpHint) {
          const ipTokens = [intent.ipSignal.cityOrArea, intent.ipSignal.countryCode, intent.ipSignal.geography].filter((x): x is string => Boolean(x)).map((x) => normalizeToken(x));
          const ipMatches = pool.filter((c) => this.matchesGeo(c, ipTokens));
          if (ipMatches.length > 0) { pool = ipMatches; triggered = true; rationale.push('Applied permissioned approximate location hint (advisory only; raw IP redacted and never persisted).'); }
        } else { warnings.push('Ignored IP-geolocation signal because allowIpHint is disabled by privacy configuration.'); }
      }
      if (triggered && pool.length > 0) {
        const costWeight: Record<string, number> = { low: 1, standard: 2, premium: 3 };
        pool.sort((a, b) => ((a.estimatedLatencyMs ?? 999) - (b.estimatedLatencyMs ?? 999)) || ((costWeight[a.costTier ?? 'standard'] ?? 2) - (costWeight[b.costTier ?? 'standard'] ?? 2)));
        const best = pool[0]; const auto = Boolean(intent.autoApproveRecommendations && !intent.requireConfirmation);
        rationale.push(`Recommended '${best.nativeLocationId}' (${best.displayName}) based on latency/cost/service fit.`);
        return this.buildResult(intent, {
          status: auto ? 'RESOLVED' : 'REQUIRES_CONFIRMATION', decisionState: 'RECOMMENDATION',
          selected: [best], alternatives: compliant.filter((c) => c.nativeLocationId !== best.nativeLocationId),
          source: auto ? 'recommendation-accepted' : undefined, topologyMode: topo,
          rationale: rationale.map(sanitize), blockers: [], warnings: warnings.map(sanitize), requiresConfirmation: !auto,
        }, catVer);
      }
    }

    return fail('REGION_SELECTION_REQUIRED', compliant,
      ['No explicit target, valid approved configuration, or authorized recommendation criteria resolved a location.'],
      ['Deployment target region/location is required before policy rendering or resource mutation.']);
  }

  private matchesGeo(c: PlacementCandidate, tokens: string[]): boolean {
    const s = new Set<string>([normalizeToken(c.nativeLocationId), normalizeToken(c.cityOrArea ?? ''), normalizeToken(c.countryCode ?? ''), normalizeToken(c.geography ?? ''), ...(c.aliases ?? []).map((a) => normalizeToken(a)), ...(c.residencyAttributes ?? []).map((r) => normalizeToken(r))]);
    return tokens.some((t) => s.has(t));
  }

  private async validateFailover(intent: PlacementIntent, prim: PlacementCandidate[], cat: PlacementCandidate[], locale: string): Promise<{ valid: boolean; candidates: PlacementCandidate[]; blockers: string[] }> {
    const blockers: string[] = [], candidates: PlacementCandidate[] = [];
    const approved = new Set((intent.approvedFailoverLocations ?? intent.approvedConfig?.approvedFailoverLocations ?? []).map((x) => normalizeToken(x)));
    if ((intent.topologyMode === 'active-passive' || intent.topologyMode === 'disaster-recovery') && prim.length > 1 && approved.size > 0) {
      for (const sec of prim.slice(1)) { if (!approved.has(normalizeToken(sec.nativeLocationId))) blockers.push(`Secondary failover location '${sec.nativeLocationId}' is not in approvedFailoverLocations.`); }
    }
    for (const raw of intent.failoverLocationIds ?? []) {
      const res = await this.adapter.resolveName({ userInput: raw, catalogue: cat, locale });
      if (res.status !== 'RESOLVED' || res.matches.length === 0) blockers.push(`Failover location '${raw}' could not be uniquely resolved.`);
      else if (!approved.has(normalizeToken(res.matches[0].nativeLocationId))) blockers.push(`Failover location '${res.matches[0].nativeLocationId}' is not pre-approved in approvedFailoverLocations.`);
      else candidates.push(res.matches[0]);
    }
    return { valid: blockers.length === 0, candidates, blockers };
  }

  private buildResult(intent: PlacementIntent, partial: Omit<ResolvedPlacement, 'planFingerprint' | 'catalogueVersion' | 'regionSummaries'>, defaultCatVer?: string): ResolvedPlacement {
    const catVer = partial.selected[0]?.catalogueVersion ?? partial.alternatives[0]?.catalogueVersion ?? defaultCatVer ?? 'unknown';
    const regionSummaries: MultiRegionChangeSummary[] = partial.selected.map((c, idx) => ({
      nativeLocationId: c.nativeLocationId, displayName: c.displayName,
      role: partial.topologyMode === 'single-region' ? 'primary' : partial.topologyMode === 'active-active' ? (idx === 0 ? 'primary' : 'active-peer') : partial.topologyMode === 'active-passive' ? (idx === 0 ? 'primary' : 'passive-standby') : partial.topologyMode === 'disaster-recovery' ? (idx === 0 ? 'primary' : 'dr-target') : 'independent',
      environmentId: intent.environmentId, plannedAction: idx === 0 || partial.topologyMode === 'active-active' ? 'PROVISION' : 'VALIDATE_FAILOVER',
      residencyCompliant: UniversalPlacementResolver.satisfiesResidency(c, (intent.residencyRequirements ?? []).map((r) => normalizeToken(r))),
      servicesVerified: c.availability === 'available',
    }));
    const fpPayload = JSON.stringify({
      providerId: intent.providerId, scope: intent.scope, projectId: intent.projectId, environmentId: intent.environmentId,
      workloadId: intent.workloadId ?? '', status: partial.status, decisionState: partial.decisionState,
      source: partial.source ?? 'none', topologyMode: partial.topologyMode, selectedIds: partial.selected.map((s) => s.nativeLocationId), catalogueVersion: catVer,
    });
    const planFingerprint = crypto.createHash('sha256').update(fpPayload, 'utf8').digest('hex');
    const promptMessage = partial.promptMessage ?? (partial.status === 'REGION_SELECTION_REQUIRED'
      ? 'Where should Ugondu deploy this workload? Enter a city, country, or provider region ID—for example Paris, France, Nigeria, South Africa, or eu-west-3. If you are unsure, choose Recommend for me. Ugondu will compare supported locations against your customers, latency, cost, data-residency rules, and required services before proposing a target.' : undefined);
    const cliExample = partial.cliExample ?? (partial.status === 'REGION_SELECTION_REQUIRED'
      ? `ugondu deploy --provider ${intent.providerId} --project ${intent.projectId} --env ${intent.environmentId} --region <Paris|France|Nigeria|South Africa|eu-west-3>` : undefined);
    const configExample = partial.configExample ?? (partial.status === 'REGION_SELECTION_REQUIRED'
      ? `apiVersion: ugondu.dev/v1\nkind: DeploymentPlacement\nmetadata:\n  project: ${intent.projectId}\n  environment: ${intent.environmentId}\nspec:\n  provider: ${intent.providerId}\n  selection:\n    mode: explicit\n    locations:\n      - id: <actor-selected-native-location-id>` : undefined);
    return { ...partial, promptMessage, cliExample, configExample, regionSummaries, planFingerprint, catalogueVersion: catVer };
  }
}

export async function resolvePlacementTarget(input: PlacementInput, actor?: PlacementActor, resolver?: UniversalPlacementResolver): Promise<PlacementCandidate> {
  return (resolver ?? new UniversalPlacementResolver()).resolvePlacementTarget(input, actor);
}
