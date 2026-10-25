/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Capabilities / Continuity Verification Suite
 * File           : universal-placement-resolver.spec.ts
 * Version        : 1.2.0
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

import {
  AuthoritativeLocationCatalogue,
  DefaultPlacementAdapter,
  DynamicLocationCatalogueProvider,
  PlacementIntent,
  UniversalPlacementResolver,
  redactIpLiterals,
} from '../continuity/UniversalPlacementResolver';

function baseIntent(overrides: Partial<PlacementIntent> = {}): PlacementIntent {
  return {
    providerId: 'aws', scope: 'environment', projectId: 'proj-alpha',
    environmentId: 'production', workloadId: 'api-gateway',
    allowRecommendation: false, allowIpHint: false, requireConfirmation: false,
    ...overrides,
  };
}

describe('UniversalPlacementResolver & Normative COR Addendum Verification', () => {
  const resolver = new UniversalPlacementResolver();

  afterEach(() => {
    DynamicLocationCatalogueProvider.resetInstance();
  });

  describe('1. AuthoritativeLocationCatalogue & Multi-Provider Adapter', () => {
    it('lists rich cloud regions for AWS, GCP, and Azure', async () => {
      const adapter = new DefaultPlacementAdapter();
      const aws = await adapter.listLocations({ providerId: 'aws', tenantRef: 't1', requiredCapabilities: [] });
      const gcp = await adapter.listLocations({ providerId: 'gcp', tenantRef: 't1', requiredCapabilities: [] });
      const azure = await adapter.listLocations({ providerId: 'azure', tenantRef: 't1', requiredCapabilities: [] });

      expect(aws.map((r) => r.nativeLocationId)).toEqual(
        expect.arrayContaining(['eu-west-3', 'af-south-1', 'eu-central-1', 'eu-west-1', 'eu-west-2', 'us-east-1', 'us-west-2', 'ap-southeast-1', 'ap-northeast-1', 'sa-east-1'])
      );
      expect(gcp.map((r) => r.nativeLocationId)).toEqual(expect.arrayContaining(['europe-west9', 'africa-south1', 'us-east4']));
      expect(azure.map((r) => r.nativeLocationId)).toEqual(expect.arrayContaining(['francecentral', 'southafricanorth', 'eastus']));
      expect(aws[0].catalogueVersion).toMatch(/^cat-aws-[a-f0-9]{16}$/);
    });

    it('declares honest non-cloud placement models for vps, cpanel, directadmin, and private-host', async () => {
      const cpanelRes = await resolver.resolve(baseIntent({ providerId: 'cpanel', userInput: 'Paris' }));
      expect(cpanelRes.status).toBe('RESOLVED');
      expect(cpanelRes.selected[0].locationType).toBe('hosting-location');
      expect(cpanelRes.warnings.some((w) => w.includes('hosting-location'))).toBe(true);

      const directAdminRes = await resolver.resolve(baseIntent({ providerId: 'directadmin', userInput: 'Germany' }));
      expect(directAdminRes.status).toBe('RESOLVED');
      expect(directAdminRes.selected[0].locationType).toBe('hosting-location');

      const vpsRes = await resolver.resolve(baseIntent({ providerId: 'vps', userInput: 'Nigeria' }));
      expect(vpsRes.status).toBe('RESOLVED');
      expect(vpsRes.selected[0].nativeLocationId).toBe('vps-dc-af-los1');
      expect(vpsRes.selected[0].locationType).toBe('datacenter');

      const privRes = await resolver.resolve(baseIntent({ providerId: 'private-host', userInput: 'Paris' }));
      expect(privRes.status).toBe('RESOLVED');
      expect(privRes.selected[0].locationType).toBe('datacenter');
    });

    it('fails closed with UNAVAILABLE when provider catalogue is empty or unknown', async () => {
      const res = await resolver.resolve(baseIntent({ providerId: 'unknown-cloud', userInput: 'Paris' }));
      expect(res.status).toBe('UNAVAILABLE');
      expect(res.decisionState).toBe('UNRESOLVED');
      expect(res.selected).toHaveLength(0);
    });
  });

  describe('2. Beginner-Friendly Resolution & Ambiguity Guardrails (Priority 2)', () => {
    it.each([
      ['Paris', 'eu-west-3'], ['France', 'eu-west-3'], ['eu-west-3', 'eu-west-3'],
      ['South Africa', 'af-south-1'], ['Cape Town', 'af-south-1'], ['Nigeria', 'af-south-1'],
      ['West Africa', 'af-south-1'], ['af-south-1', 'af-south-1'], ['São Paulo', 'sa-east-1'],
      ['Tokyo', 'ap-northeast-1'],
    ])('resolves beginner-friendly input "%s" on AWS to "%s"', async (userInput, expectedId) => {
      const res = await resolver.resolve(baseIntent({ userInput }));
      expect(res.status).toBe('RESOLVED');
      expect(res.decisionState).toBe('ACTOR_SELECTED');
      expect(res.source).toBe('actor-explicit');
      expect(res.selected[0].nativeLocationId).toBe(expectedId);
    });

    it('returns AMBIGUOUS with all matching candidates when input maps to multiple regions (e.g., Europe, USA)', async () => {
      const euRes = await resolver.resolve(baseIntent({ userInput: 'Europe' }));
      expect(euRes.status).toBe('AMBIGUOUS');
      expect(euRes.alternatives.map((a) => a.nativeLocationId)).toEqual(
        expect.arrayContaining(['eu-west-3', 'eu-central-1', 'eu-west-1', 'eu-west-2'])
      );

      const usRes = await resolver.resolve(baseIntent({ userInput: 'USA' }));
      expect(usRes.status).toBe('AMBIGUOUS');
      expect(usRes.alternatives.map((a) => a.nativeLocationId)).toEqual(expect.arrayContaining(['us-east-1', 'us-west-2']));
    });

    it('returns UNSUPPORTED with valid provider alternatives when location does not exist on provider', async () => {
      const res = await resolver.resolve(baseIntent({ userInput: 'Antarctica' }));
      expect(res.status).toBe('UNSUPPORTED');
      expect(res.decisionState).toBe('UNRESOLVED');
      expect(res.selected).toHaveLength(0);
      expect(res.alternatives.length).toBeGreaterThan(0);
    });

    it('returns UNSUPPORTED when required capability is missing on selected target', async () => {
      const res = await resolver.resolve(baseIntent({ providerId: 'cpanel', userInput: 'Paris', requiredCapabilities: ['kubernetes'] }));
      expect(res.status).toBe('UNSUPPORTED');
      expect(res.blockers.some((b) => b.includes('kubernetes'))).toBe(true);
    });
  });

  describe('3. Legal, Residency & Sovereignty Constraints (Priority 1)', () => {
    it('blocks explicit selection that conflicts with residency policy with CONFLICTS_WITH_POLICY', async () => {
      const res = await resolver.resolve(baseIntent({ userInput: 'Northern Virginia', residencyRequirements: ['EU', 'GDPR'] }));
      expect(res.status).toBe('CONFLICTS_WITH_POLICY');
      expect(res.blockers[0]).toContain('conflicts with residency policy');
    });

    it('permits explicit selection when residency requirements are satisfied', async () => {
      const res = await resolver.resolve(baseIntent({ userInput: 'Paris', residencyRequirements: ['EU', 'FR'] }));
      expect(res.status).toBe('RESOLVED');
      expect(res.selected[0].nativeLocationId).toBe('eu-west-3');
    });

    it('blocks when residency requirements cannot be satisfied by any region on provider', async () => {
      const res = await resolver.resolve(baseIntent({ allowRecommendation: true, residencyRequirements: ['SOVEREIGN_MARS'] }));
      expect(res.status).toBe('CONFLICTS_WITH_POLICY');
    });
  });

  describe('4. Scoped Approved Configuration Reuse & Isolation (Priority 3)', () => {
    const validConfig = {
      providerId: 'aws', projectId: 'proj-alpha', environmentId: 'production',
      workloadId: 'api-gateway', locations: ['eu-west-3'],
      approvedBy: 'sec-ops@air-roofers.fr', approvedAt: '2026-10-21T10:00:00Z',
    };

    it('reuses approvedConfig when providerId, projectId, environmentId, and workloadId match', async () => {
      const res = await resolver.resolve(baseIntent({ approvedConfig: validConfig }));
      expect(res.status).toBe('RESOLVED');
      expect(res.decisionState).toBe('APPROVED_CONFIG');
      expect(res.source).toBe('approved-project-config');
      expect(res.selected[0].nativeLocationId).toBe('eu-west-3');
      expect(res.requiresConfirmation).toBe(false);
    });

    it('never inherits approvedConfig from a different project, environment, workload, or provider', async () => {
      const wrongProject = await resolver.resolve(baseIntent({ approvedConfig: { ...validConfig, projectId: 'proj-other' } }));
      expect(wrongProject.status).toBe('REGION_SELECTION_REQUIRED');
      expect(wrongProject.warnings.some((w) => w.includes('scope did not match'))).toBe(true);

      const wrongEnv = await resolver.resolve(baseIntent({ approvedConfig: { ...validConfig, environmentId: 'staging' } }));
      expect(wrongEnv.status).toBe('REGION_SELECTION_REQUIRED');

      const wrongWorkload = await resolver.resolve(baseIntent({ approvedConfig: { ...validConfig, workloadId: 'worker-queue' } }));
      expect(wrongWorkload.status).toBe('REGION_SELECTION_REQUIRED');

      const wrongProvider = await resolver.resolve(baseIntent({ providerId: 'gcp', approvedConfig: validConfig }));
      expect(wrongProvider.status).toBe('REGION_SELECTION_REQUIRED');
    });

    it('invalidates approvedConfig if catalogueVersion changed or new residency policy conflicts', async () => {
      const staleCat = await resolver.resolve(baseIntent({ approvedConfig: { ...validConfig, catalogueVersion: '2024.01.01-old' } }));
      expect(staleCat.status).toBe('REGION_SELECTION_REQUIRED');
      expect(staleCat.warnings.some((w) => w.includes('catalogue version changed'))).toBe(true);

      const policyConflict = await resolver.resolve(baseIntent({ approvedConfig: validConfig, residencyRequirements: ['AFRICA'] }));
      expect(policyConflict.status).toBe('CONFLICTS_WITH_POLICY');
    });
  });

  describe('5. Audience Geography vs. Developer IP Geolocation & Privacy (Priorities 4, 5, 6)', () => {
    it('recommends af-south-1 for African/Nigerian audience even when developer IP hint is in France', async () => {
      const res = await resolver.resolve(baseIntent({
        allowRecommendation: true, allowIpHint: true, audienceGeographies: ['Africa', 'Nigeria'],
        ipSignal: { countryCode: 'FR', cityOrArea: 'Paris', rawIp: '203.0.113.195' },
      }));
      expect(res.status).toBe('REQUIRES_CONFIRMATION');
      expect(res.decisionState).toBe('RECOMMENDATION');
      expect(res.selected[0].nativeLocationId).toBe('af-south-1');
      expect(JSON.stringify(res)).not.toContain('203.0.113.195');
    });

    it('honors explicit actor selection over conflicting IP geolocation signal', async () => {
      const res = await resolver.resolve(baseIntent({
        userInput: 'Nigeria', allowIpHint: true,
        ipSignal: { countryCode: 'FR', cityOrArea: 'Paris', rawIp: '198.51.100.88' },
      }));
      expect(res.status).toBe('RESOLVED');
      expect(res.decisionState).toBe('ACTOR_SELECTED');
      expect(res.selected[0].nativeLocationId).toBe('af-south-1');
      expect(res.rationale.some((r) => r.includes('Explicit actor selection honored'))).toBe(true);
      expect(JSON.stringify(res)).not.toContain('198.51.100.88');
    });

    it('ignores IP geolocation signal when allowIpHint is false and never silently falls back', async () => {
      const res = await resolver.resolve(baseIntent({
        allowRecommendation: true, allowIpHint: false,
        ipSignal: { countryCode: 'FR', cityOrArea: 'Paris', rawIp: '192.0.2.55' },
      }));
      expect(res.status).toBe('REGION_SELECTION_REQUIRED');
      expect(res.warnings.some((w) => w.includes('allowIpHint is disabled'))).toBe(true);
      expect(JSON.stringify(res)).not.toContain('192.0.2.55');
    });

    it('uses permissioned IP hint as advisory recommendation requiring confirmation unless auto-approved', async () => {
      const advisory = await resolver.resolve(baseIntent({
        allowRecommendation: true, allowIpHint: true,
        ipSignal: { countryCode: 'FR', cityOrArea: 'Paris', rawIp: '198.51.100.12' },
      }));
      expect(advisory.status).toBe('REQUIRES_CONFIRMATION');
      expect(advisory.decisionState).toBe('RECOMMENDATION');
      expect(advisory.selected[0].nativeLocationId).toBe('eu-west-3');
      expect(JSON.stringify(advisory)).not.toContain('198.51.100.12');

      const autoApproved = await resolver.resolve(baseIntent({
        allowRecommendation: true, allowIpHint: true, autoApproveRecommendations: true,
        requireConfirmation: false, ipSignal: { countryCode: 'FR', cityOrArea: 'Paris' },
      }));
      expect(autoApproved.status).toBe('RESOLVED');
      expect(autoApproved.source).toBe('recommendation-accepted');
    });

    it('redacts IPv4 and IPv6 literals via redactIpLiterals', () => {
      const dirty = 'Signal from 192.0.2.101 and 2001:0db8:85a3:0000:0000:8a2e:0370:7334 recorded.';
      const clean = redactIpLiterals(dirty, '192.0.2.101');
      expect(clean).not.toContain('192.0.2.101');
      expect(clean).not.toContain('2001:0db8');
      expect(clean).toContain('[REDACTED_IP]');
    });

    it('enforces latency objectives and returns UNAVAILABLE if no region meets objective', async () => {
      const impossibleLat = await resolver.resolve(baseIntent({ allowRecommendation: true, latencyObjectivesMs: { max: 5 } }));
      expect(impossibleLat.status).toBe('UNAVAILABLE');
    });
  });

  describe('6. Missing Target & Beginner Prompt (Priority 7)', () => {
    it('returns REGION_SELECTION_REQUIRED with normative prompt and CLI/YAML examples when unresolved', async () => {
      const blankRes = await resolver.resolve(baseIntent({ userInput: '   ' }));
      expect(blankRes.status).toBe('REGION_SELECTION_REQUIRED');
      expect(blankRes.promptMessage).toContain('Where should Ugondu deploy this workload?');
      expect(blankRes.promptMessage).toContain('Paris');
      expect(blankRes.promptMessage).toContain('Nigeria');
      expect(blankRes.promptMessage).toContain('eu-west-3');
      expect(blankRes.cliExample).toContain('ugondu deploy');
      expect(blankRes.configExample).toContain('kind: DeploymentPlacement');
    });
  });

  describe('7. Multi-Region Topologies, Failover Governance & Deterministic Fingerprints', () => {
    it('supports multi-region active-passive plans with pre-approved failover locations', async () => {
      const res = await resolver.resolve(baseIntent({
        explicitLocationIds: ['Paris'], failoverLocationIds: ['Frankfurt'],
        approvedFailoverLocations: ['eu-central-1'], topologyMode: 'active-passive',
      }));
      expect(res.status).toBe('RESOLVED');
      expect(res.topologyMode).toBe('active-passive');
      expect(res.selected.map((s) => s.nativeLocationId)).toEqual(['eu-west-3', 'eu-central-1']);
      expect(res.regionSummaries).toEqual([
        expect.objectContaining({ nativeLocationId: 'eu-west-3', role: 'primary', plannedAction: 'PROVISION' }),
        expect.objectContaining({ nativeLocationId: 'eu-central-1', role: 'passive-standby', plannedAction: 'VALIDATE_FAILOVER' }),
      ]);
      expect(res.planFingerprint).toMatch(/^[a-f0-9]{64}$/);
    });

    it('rejects multi-region plan when failover location is not in approvedFailoverLocations', async () => {
      const res = await resolver.resolve(baseIntent({
        explicitLocationIds: ['Paris'], failoverLocationIds: ['Tokyo'],
        approvedFailoverLocations: ['eu-central-1'], topologyMode: 'disaster-recovery',
      }));
      expect(res.status).toBe('CONFLICTS_WITH_POLICY');
      expect(res.blockers.some((b) => b.includes('ap-northeast-1'))).toBe(true);
    });

    it('supports independent per-environment placement mappings', async () => {
      const envMap = { development: ['Paris'], staging: ['Frankfurt'], production: ['Cape Town', 'Paris'] };
      const devRes = await resolver.resolve(baseIntent({ environmentId: 'development', environmentLocations: envMap }));
      const prodRes = await resolver.resolve(baseIntent({ environmentId: 'production', environmentLocations: envMap }));
      expect(devRes.selected.map((s) => s.nativeLocationId)).toEqual(['eu-west-3']);
      expect(prodRes.selected.map((s) => s.nativeLocationId)).toEqual(['af-south-1', 'eu-west-3']);
      expect(prodRes.topologyMode).toBe('active-active');
      expect(devRes.planFingerprint).not.toBe(prodRes.planFingerprint);
    });
  });

  describe('8. Dynamic Catalogue Refresh, Provenance & Invalidation (UG-COR-AUD-002)', () => {
    it('reports cached-fallback provenance and valid timestamp on seed catalogue fetch', async () => {
      const provider = DynamicLocationCatalogueProvider.getInstance();
      const res = await provider.fetchLocations('aws');
      expect(res.provenance).toBe('cached-fallback');
      expect(res.catalogueVersion).toMatch(/^cat-aws-[a-f0-9]{16}$/);
      expect(new Date(res.observedAt).getTime()).toBeGreaterThan(0);
      expect(res.locations.length).toBeGreaterThan(0);
      expect(res.locations[0].catalogueVersion).toBe(res.catalogueVersion);
    });

    it('reports live-discovered provenance when discovery hook succeeds', async () => {
      const provider = DynamicLocationCatalogueProvider.getInstance();
      provider.registerDiscoveryHook('aws', async () => [
        {
          providerId: 'aws', nativeLocationId: 'eu-west-3', displayName: 'Europe (Paris)',
          locationType: 'region', capabilities: ['compute', 'kms'], availability: 'available',
          catalogueVersion: '', observedAt: '',
        },
      ]);
      const res = await provider.fetchLocations('aws', { forceRefresh: true });
      expect(res.provenance).toBe('live-discovered');
      expect(res.locations).toHaveLength(1);
      expect(res.locations[0].nativeLocationId).toBe('eu-west-3');
    });

    it('falls back to seed snapshot with cached-fallback when discovery hook throws or fails', async () => {
      const provider = DynamicLocationCatalogueProvider.getInstance();
      provider.registerDiscoveryHook('aws', async () => {
        throw new Error('Network timeout during AWS discovery');
      });
      const res = await provider.fetchLocations('aws', { forceRefresh: true });
      expect(res.provenance).toBe('cached-fallback');
      expect(res.locations.some((l) => l.nativeLocationId === 'eu-west-3')).toBe(true);
    });

    it('invalidates cache correctly and refreshes catalogue', async () => {
      const provider = DynamicLocationCatalogueProvider.getInstance();
      const initial = await provider.fetchLocations('aws');
      expect(initial.provenance).toBe('cached-fallback');

      provider.registerDiscoveryHook('aws', async () => [
        {
          providerId: 'aws', nativeLocationId: 'us-east-1', displayName: 'US East',
          locationType: 'region', capabilities: ['compute'], availability: 'available',
          catalogueVersion: '', observedAt: '',
        },
      ]);
      // Still returns cached before invalidation
      const cached = await provider.fetchLocations('aws');
      expect(cached.provenance).toBe('cached-fallback');

      // After invalidation, discovers new
      provider.invalidateCache('aws');
      const refreshed = await provider.fetchLocations('aws');
      expect(refreshed.provenance).toBe('live-discovered');
      expect(refreshed.locations).toHaveLength(1);
    });
  });
});
