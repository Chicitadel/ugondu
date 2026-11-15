/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Execution Continuity & Policy Governance
 * File           : LocationCatalogueProvider.ts
 * Version        : 1.3.0
 * Author         : Air Roofers SASU / Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-22
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

export type LocationCatalogueProvenance = 'live-discovered' | 'cached-fallback' | 'provider-published';
export type PlacementLocationType = 'region' | 'zone' | 'cluster' | 'datacenter' | 'hosting-location' | 'provider-defined';

export interface PlacementCandidate {
  providerId: string;
  nativeLocationId: string;
  displayName: string;
  countryCode?: string;
  cityOrArea?: string;
  geography?: string;
  aliases?: string[];
  locationType: PlacementLocationType;
  capabilities: string[];
  availability: 'available' | 'restricted' | 'unknown';
  estimatedLatencyMs?: number;
  latencySource?: 'measured' | 'provider-published' | 'estimated';
  residencyAttributes?: string[];
  costTier?: 'low' | 'standard' | 'premium';
  catalogueVersion: string;
  observedAt: string;
}

export interface LocationCatalogueResult {
  providerId: string;
  locations: PlacementCandidate[];
  catalogueVersion: string;
  observedAt: string;
  provenance: LocationCatalogueProvenance;
  ttlSeconds: number;
}

export type LocationDiscoveryHook = (
  providerId: string
) => Promise<PlacementCandidate[] | LocationCatalogueResult | null> | PlacementCandidate[] | LocationCatalogueResult | null;

export interface ILocationCatalogueProvider {
  fetchLocations(providerId: string, options?: { forceRefresh?: boolean }): Promise<LocationCatalogueResult>;
  invalidateCache(providerId?: string): void;
}

export interface DynamicLocationCatalogueOptions {
  defaultTtlSeconds?: number;
  seedSnapshot?: Record<string, PlacementCandidate[]>;
  clock?: () => Date;
}

const CLOUD_CAPS = ['compute', 'containers', 'iam-regional-condition', 'kms', 'vpc', 'rds', 's3', 'cloudwatch'];

function seedLoc(
  providerId: string, nativeLocationId: string, displayName: string, countryCode: string,
  cityOrArea: string, geography: string, aliases: string[], residencyAttributes: string[],
  estimatedLatencyMs: number, costTier: 'low' | 'standard' | 'premium' = 'standard',
  locationType: PlacementLocationType = 'region', capabilities: string[] = CLOUD_CAPS
): PlacementCandidate {
  return {
    providerId, nativeLocationId, displayName, countryCode, cityOrArea, geography, aliases,
    locationType, capabilities, availability: 'available', estimatedLatencyMs,
    latencySource: locationType === 'region' ? 'provider-published' : 'estimated',
    residencyAttributes, costTier, catalogueVersion: 'seed-uninitialized', observedAt: '',
  };
}

export const VERIFIED_SEED_CATALOGUE: Record<string, PlacementCandidate[]> = {
  aws: [
    seedLoc('aws', 'eu-west-3', 'Europe (Paris)', 'FR', 'Paris', 'Western Europe', ['paris', 'france', 'western europe', 'europe', 'hexagone'], ['EU', 'EEA', 'GDPR', 'FR', 'EUROPE', 'WESTERN_EUROPE'], 18, 'standard'),
    seedLoc('aws', 'af-south-1', 'Africa (Cape Town)', 'ZA', 'Cape Town', 'Africa', ['cape town', 'south africa', 'africa', 'sub-saharan africa', 'nigeria', 'west africa', 'lagos'], ['AFRICA', 'SUB_SAHARAN_AFRICA', 'ZA'], 42, 'standard'),
    seedLoc('aws', 'eu-central-1', 'Europe (Frankfurt)', 'DE', 'Frankfurt', 'Central Europe', ['frankfurt', 'germany', 'central europe', 'europe'], ['EU', 'EEA', 'GDPR', 'DE', 'EUROPE'], 20, 'standard'),
    seedLoc('aws', 'eu-west-1', 'Europe (Ireland)', 'IE', 'Dublin', 'Western Europe', ['dublin', 'ireland', 'europe'], ['EU', 'EEA', 'GDPR', 'IE', 'EUROPE'], 24, 'low'),
    seedLoc('aws', 'eu-west-2', 'Europe (London)', 'GB', 'London', 'Western Europe', ['london', 'uk', 'united kingdom', 'great britain', 'europe'], ['UK', 'GB', 'EUROPE'], 21, 'standard'),
    seedLoc('aws', 'us-east-1', 'US East (N. Virginia)', 'US', 'Northern Virginia', 'North America', ['northern virginia', 'virginia', 'n. virginia', 'usa', 'united states', 'us', 'north america'], ['US', 'USA', 'NORTH_AMERICA'], 75, 'low'),
    seedLoc('aws', 'us-west-2', 'US West (Oregon)', 'US', 'Oregon', 'North America', ['oregon', 'usa', 'united states', 'us', 'north america'], ['US', 'USA', 'NORTH_AMERICA'], 135, 'low'),
    seedLoc('aws', 'ap-southeast-1', 'Asia Pacific (Singapore)', 'SG', 'Singapore', 'Southeast Asia', ['singapore', 'southeast asia', 'apac', 'asia'], ['APAC', 'SG', 'ASIA'], 160, 'standard'),
    seedLoc('aws', 'ap-northeast-1', 'Asia Pacific (Tokyo)', 'JP', 'Tokyo', 'East Asia', ['tokyo', 'japan', 'east asia', 'apac', 'asia'], ['APAC', 'JP', 'ASIA'], 210, 'standard'),
    seedLoc('aws', 'sa-east-1', 'South America (São Paulo)', 'BR', 'São Paulo', 'South America', ['sao paulo', 'brazil', 'south america', 'latam'], ['LATAM', 'BR', 'SOUTH_AMERICA'], 185, 'premium'),
  ],
  gcp: [
    seedLoc('gcp', 'europe-west9', 'Europe West 9 (Paris)', 'FR', 'Paris', 'Western Europe', ['paris', 'france', 'western europe', 'europe'], ['EU', 'EEA', 'GDPR', 'FR', 'EUROPE'], 19, 'standard'),
    seedLoc('gcp', 'africa-south1', 'Africa South 1 (Johannesburg)', 'ZA', 'Johannesburg', 'Africa', ['johannesburg', 'south africa', 'africa', 'sub-saharan africa', 'nigeria', 'west africa'], ['AFRICA', 'SUB_SAHARAN_AFRICA', 'ZA'], 45, 'standard'),
    seedLoc('gcp', 'us-east4', 'US East 4 (Northern Virginia)', 'US', 'Virginia', 'North America', ['virginia', 'northern virginia', 'usa', 'united states', 'us'], ['US', 'USA', 'NORTH_AMERICA'], 78, 'low'),
  ],
  azure: [
    seedLoc('azure', 'francecentral', 'France Central (Paris)', 'FR', 'Paris', 'Western Europe', ['paris', 'france', 'france central', 'western europe', 'europe'], ['EU', 'EEA', 'GDPR', 'FR', 'EUROPE'], 20, 'standard'),
    seedLoc('azure', 'southafricanorth', 'South Africa North (Johannesburg)', 'ZA', 'Johannesburg', 'Africa', ['johannesburg', 'south africa', 'africa', 'sub-saharan africa', 'nigeria', 'west africa'], ['AFRICA', 'SUB_SAHARAN_AFRICA', 'ZA'], 46, 'standard'),
    seedLoc('azure', 'eastus', 'East US (Virginia)', 'US', 'Virginia', 'North America', ['virginia', 'east us', 'usa', 'united states', 'us'], ['US', 'USA', 'NORTH_AMERICA'], 76, 'low'),
  ],
  vps: [
    seedLoc('vps', 'vps-dc-eu-par1', 'VPS Datacenter Paris 1', 'FR', 'Paris', 'Western Europe', ['paris', 'france', 'europe'], ['EU', 'EEA', 'GDPR', 'FR', 'EUROPE'], 22, 'low', 'datacenter', ['compute', 'ssh', 'systemd', 'docker', 'tls']),
    seedLoc('vps', 'vps-dc-af-los1', 'VPS Datacenter Lagos 1', 'NG', 'Lagos', 'West Africa', ['lagos', 'nigeria', 'west africa', 'africa'], ['AFRICA', 'WEST_AFRICA', 'NG'], 25, 'low', 'datacenter', ['compute', 'ssh', 'systemd', 'docker', 'tls']),
  ],
  cpanel: [
    seedLoc('cpanel', 'cpanel-account-host', 'cPanel Managed Hosting Account Target', 'FR', 'Paris', 'Western Europe', ['paris', 'france', 'cpanel-host'], ['EU', 'GDPR', 'FR'], 28, 'low', 'hosting-location', ['web-hosting', 'tls', 'dns-zone', 'mysql']),
  ],
  directadmin: [
    seedLoc('directadmin', 'directadmin-account-host', 'DirectAdmin Hosting Account Target', 'DE', 'Frankfurt', 'Central Europe', ['frankfurt', 'germany', 'directadmin-host'], ['EU', 'GDPR', 'DE'], 26, 'low', 'hosting-location', ['web-hosting', 'tls', 'dns-zone', 'mariadb']),
  ],
  'private-host': [
    seedLoc('private-host', 'private-onprem-dc1', 'Private Sovereign Datacenter 1', 'FR', 'Paris', 'Western Europe', ['paris', 'france', 'on-prem', 'sovereign-dc'], ['EU', 'GDPR', 'FR', 'SOVEREIGN'], 12, 'standard', 'datacenter', ['bare-metal', 'kubernetes', 'ssh', 'airgapped-ready']),
  ],
};

interface CacheEntry {
  result: LocationCatalogueResult;
  cachedAtMs: number;
}

export class DynamicLocationCatalogueProvider implements ILocationCatalogueProvider {
  private static instance: DynamicLocationCatalogueProvider | null = null;
  private readonly ttlSeconds: number;
  private readonly seedSnapshot: Record<string, PlacementCandidate[]>;
  private readonly clock: () => Date;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly discoveryHooks = new Map<string, LocationDiscoveryHook>();
  private readonly publishedCatalogues = new Map<string, PlacementCandidate[]>();

  constructor(options?: DynamicLocationCatalogueOptions) {
    this.ttlSeconds = options?.defaultTtlSeconds ?? 3600;
    this.seedSnapshot = options?.seedSnapshot ?? VERIFIED_SEED_CATALOGUE;
    this.clock = options?.clock ?? (() => new Date());
  }

  public static getInstance(options?: DynamicLocationCatalogueOptions): DynamicLocationCatalogueProvider {
    if (!DynamicLocationCatalogueProvider.instance) {
      DynamicLocationCatalogueProvider.instance = new DynamicLocationCatalogueProvider(options);
    }
    return DynamicLocationCatalogueProvider.instance;
  }

  public static resetInstance(): void {
    DynamicLocationCatalogueProvider.instance = null;
  }

  public registerDiscoveryHook(providerId: string, hook: LocationDiscoveryHook): void {
    this.discoveryHooks.set(providerId.trim().toLowerCase(), hook);
  }

  public unregisterDiscoveryHook(providerId: string): void {
    this.discoveryHooks.delete(providerId.trim().toLowerCase());
  }

  public hasDiscoveryHook(providerId: string): boolean {
    return this.discoveryHooks.has(providerId.trim().toLowerCase());
  }

  public registerPublishedCatalogue(providerId: string, locations: PlacementCandidate[]): void {
    this.publishedCatalogues.set(providerId.trim().toLowerCase(), locations);
  }

  public unregisterPublishedCatalogue(providerId: string): void {
    this.publishedCatalogues.delete(providerId.trim().toLowerCase());
  }

  public invalidateCache(providerId?: string): void {
    if (providerId) {
      this.cache.delete(providerId.trim().toLowerCase());
    } else {
      this.cache.clear();
    }
  }

  public getSeedLocations(providerId: string): PlacementCandidate[] {
    const norm = providerId.trim().toLowerCase();
    const seeds = this.seedSnapshot[norm] ?? [];
    return seeds.map((s) => ({ ...s }));
  }

  public async fetchLocations(providerId: string, options?: { forceRefresh?: boolean }): Promise<LocationCatalogueResult> {
    const norm = providerId.trim().toLowerCase();
    const now = this.clock();
    const nowMs = now.getTime();

    if (!options?.forceRefresh) {
      const cached = this.cache.get(norm);
      if (cached && (nowMs - cached.cachedAtMs) < (cached.result.ttlSeconds * 1000)) {
        return cached.result;
      }
    }

    const hook = this.discoveryHooks.get(norm);
    if (hook) {
      try {
        const live = await hook(norm);
        if (live) {
          if (Array.isArray(live) && live.length > 0) {
            const result = this.buildResult(norm, live, 'live-discovered', now);
            this.cache.set(norm, { result, cachedAtMs: nowMs });
            return result;
          }
          if (!Array.isArray(live) && 'locations' in live && live.locations.length > 0) {
            const catVer = live.catalogueVersion || this.computeCatalogueVersion(norm, live.locations);
            const obs = live.observedAt || now.toISOString();
            const result: LocationCatalogueResult = {
              providerId: norm,
              locations: live.locations.map((c) => ({
                ...c,
                providerId: norm,
                catalogueVersion: catVer,
                observedAt: c.observedAt?.trim() || obs,
              })),
              catalogueVersion: catVer,
              observedAt: obs,
              provenance: 'live-discovered',
              ttlSeconds: live.ttlSeconds ?? this.ttlSeconds,
            };
            this.cache.set(norm, { result, cachedAtMs: nowMs });
            return result;
          }
        }
      } catch {
        // Discovery hook error or offline condition; fall through to seed fallback
      }
    }

    const published = this.publishedCatalogues.get(norm);
    if (published && published.length > 0) {
      const result = this.buildResult(norm, published, 'provider-published', now);
      this.cache.set(norm, { result, cachedAtMs: nowMs });
      return result;
    }

    const seeds = this.seedSnapshot[norm];
    if (seeds && seeds.length > 0) {
      const result = this.buildResult(norm, seeds, 'cached-fallback', now);
      this.cache.set(norm, { result, cachedAtMs: nowMs });
      return result;
    }

    const emptyResult: LocationCatalogueResult = {
      providerId: norm,
      locations: [],
      catalogueVersion: `cat-${norm}-empty`,
      observedAt: now.toISOString(),
      provenance: 'cached-fallback',
      ttlSeconds: 60,
    };
    return emptyResult;
  }

  private buildResult(
    providerId: string,
    candidates: PlacementCandidate[],
    provenance: LocationCatalogueProvenance,
    now: Date
  ): LocationCatalogueResult {
    const trueObserved = candidates.find((c) => c.observedAt && c.observedAt.trim().length > 0)?.observedAt;
    const observedAt = trueObserved || now.toISOString();
    const catalogueVersion = this.computeCatalogueVersion(providerId, candidates);
    const locations = candidates.map((c) => ({
      ...c,
      providerId,
      catalogueVersion,
      observedAt: (c.observedAt && c.observedAt.trim().length > 0) ? c.observedAt : observedAt,
    }));
    return {
      providerId,
      locations,
      catalogueVersion,
      observedAt,
      provenance,
      ttlSeconds: this.ttlSeconds,
    };
  }

  private computeCatalogueVersion(providerId: string, candidates: PlacementCandidate[]): string {
    const sorted = [...candidates].sort((a, b) => a.nativeLocationId.localeCompare(b.nativeLocationId));
    const token = sorted
      .map((c) => `${c.nativeLocationId}:${c.availability}:${(c.capabilities ?? []).slice().sort().join(',')}`)
      .join('|');
    const digest = crypto.createHash('sha256').update(`${providerId}:${token}`, 'utf8').digest('hex').substring(0, 16);
    return `cat-${providerId}-${digest}`;
  }
}
