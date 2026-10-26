/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : server/engine-core/targets/__tests__
 * File           : directadmin.spec.ts
 * Version        : 2.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-21
 * Last Modified  : 2026-10-21
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
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority : Ujomor Systems Engineering
 * - Security Authority     : Ujomor Systems Governance
 * - Governance Authority   : Air Roofers Corporate Governance
 * - Deployment Authority   : Ujomor Delivery Authority
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import {
  discoverDirectAdminCapabilities,
  discoverDirectAdminEnvironmentTwin,
  DirectAdminTargetAdapter,
  Target,
} from '../directadmin';
import { DirectAdminNativeClient } from '../../fabric/providers/directadmin-native-client';

describe('DirectAdmin native client safety and truthful status', () => {
  it('rejects path traversal identifiers before opening an SSH connection', async () => {
    const client = new DirectAdminNativeClient('da.example.net', 22, 'safeuser', '/tmp/test-key');

    await expect(client.removeHostedApp('../../etc')).rejects.toThrow();
    await expect(client.removeAccountFILE('../billing.json')).rejects.toThrow();
    await expect(client.removeDatabase('db/name')).rejects.toThrow();
    await expect(client.createSnapshot({ resourceId: '../other-domain' })).rejects.toThrow();

    await expect(
      Promise.resolve().then(() => new DirectAdminNativeClient('da.example.net', 22, '../other-user', '/tmp/test-key'))
    ).rejects.toThrow();
  });

  it('rejects an invalid SSH port before connecting', () => {
    expect(() => new DirectAdminNativeClient('da.example.net', 0, 'safeuser', '/tmp/test-key')).toThrow();
    expect(() => new DirectAdminNativeClient('da.example.net', 65536, 'safeuser', '/tmp/test-key')).toThrow();
  });

  it('does not claim an application is deployed when the adapter cannot deploy images', async () => {
    const client = new DirectAdminNativeClient('da.example.net', 22, 'safeuser', '/tmp/test-key');

    await expect(client.createHostedApp('acme.example.net', 'node:22-alpine')).rejects.toThrow();
    await expect(client.removeHostedApp('acme.example.net')).rejects.toThrow();
    // The adapter never used to execute the image or verify HTTP health; a
    // successful mkdir must not be presented as a running application.
  });
});

describe('DirectAdmin Target & Environment Twin Governance Specifications', () => {
  const validEvidenceDigest = 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069';

  describe('1. Capability Discovery & Honest UNKNOWN Invariant', () => {
    it('(a) discoverDirectAdminCapabilities returns UNKNOWN for any capability without verified probe', () => {
      const caps = discoverDirectAdminCapabilities({});

      expect(caps.php).toBe('UNKNOWN');
      expect(caps.phpVersion).toBe('UNKNOWN');
      expect(caps.domains).toBe('UNKNOWN');
      expect(caps.subdomains).toBe('UNKNOWN');
      expect(caps.database).toBe('UNKNOWN');
      expect(caps.dnsManagement).toBe('UNKNOWN');
      expect(caps.tls).toBe('UNKNOWN');
      expect(caps.ftp).toBe('UNKNOWN');
      expect(caps.rootAccess).toBe('UNKNOWN');
      expect(caps.docker).toBe('UNKNOWN');
      expect(caps.ssh).toBe('UNKNOWN');
      expect(caps.nodejs).toBe('UNKNOWN');
      expect(caps.cron).toBe('UNKNOWN');
      expect(caps.redis).toBe('UNKNOWN');
      expect(caps.resourceLimits).toBe('UNKNOWN');
      expect(caps.systemd).toBe('UNKNOWN');
      expect(caps.privateNetworking).toBe('UNKNOWN');

      // Fixed DirectAdmin platform boundaries
      expect(caps.filesystem).toBe('ACCOUNT_SCOPED');
      expect(caps.kubernetes).toBe('UNSUPPORTED');
    });

    it('(c) Probing with verified:true and non-empty evidenceDigest returns AVAILABLE', () => {
      const caps = discoverDirectAdminCapabilities({
        probedCapabilities: {
          docker: { probed: true, verified: true, value: true, evidenceDigest: validEvidenceDigest },
          ssh: { probed: true, verified: true, value: true, evidenceDigest: validEvidenceDigest },
          cron: { verified: true, value: true, evidenceDigest: validEvidenceDigest },
          redis: { probed: true, verified: true, value: true, evidenceDigest: validEvidenceDigest },
        },
      });

      expect(caps.docker).toBe('AVAILABLE');
      expect(caps.ssh).toBe('AVAILABLE');
      expect(caps.cron).toBe('AVAILABLE');
      expect(caps.redis).toBe('AVAILABLE');
    });

    it('(d) Probing with verified:true but missing or whitespace evidenceDigest returns UNKNOWN', () => {
      const caps = discoverDirectAdminCapabilities({
        probedCapabilities: {
          docker: { probed: true, verified: true, value: true },
          ssh: { probed: true, verified: true, value: true, evidenceDigest: '' },
          nodejs: { probed: true, verified: true, value: true, evidenceDigest: '    ' },
        },
      });

      expect(caps.docker).toBe('UNKNOWN');
      expect(caps.ssh).toBe('UNKNOWN');
      expect(caps.nodejs).toBe('UNKNOWN');
    });

    it('Negative: returns UNKNOWN for unverified, unprobed, or stale probes', () => {
      const caps = discoverDirectAdminCapabilities({
        probedCapabilities: {
          rootAccess: { probed: true, verified: false, value: true, evidenceDigest: validEvidenceDigest },
          docker: { probed: false, verified: true, value: true, evidenceDigest: validEvidenceDigest },
          redis: { probed: true, verified: true, value: true, stale: true, evidenceDigest: validEvidenceDigest },
          cron: {
            probed: true,
            verified: true,
            value: true,
            evidenceDigest: validEvidenceDigest,
            collectedAt: 1000,
            staleBefore: 2000,
          },
        },
      });

      expect(caps.rootAccess).toBe('UNKNOWN');
      expect(caps.docker).toBe('UNKNOWN');
      expect(caps.redis).toBe('UNKNOWN');
      expect(caps.cron).toBe('UNKNOWN');
    });

    it('Negative: returns UNAVAILABLE when probe is verified with value false', () => {
      const caps = discoverDirectAdminCapabilities({
        probedCapabilities: {
          rootAccess: { probed: true, verified: true, value: false },
          systemd: { verified: true, value: false },
        },
      });

      expect(caps.rootAccess).toBe('UNAVAILABLE');
      expect(caps.systemd).toBe('UNAVAILABLE');
    });

    it('Negative: ignores unverifiedClaims to prevent false-positive capability reporting', () => {
      const caps = discoverDirectAdminCapabilities({
        unverifiedClaims: {
          docker: 'AVAILABLE',
          rootAccess: 'AVAILABLE',
          tls: 'AVAILABLE',
          cron: 'AVAILABLE',
        },
      });

      expect(caps.docker).toBe('UNKNOWN');
      expect(caps.rootAccess).toBe('UNKNOWN');
      expect(caps.tls).toBe('UNKNOWN');
      expect(caps.cron).toBe('UNKNOWN');
    });

    it('Negative: probe with malformed evidenceDigest returns UNKNOWN', () => {
      const caps = discoverDirectAdminCapabilities({
        probedCapabilities: {
          docker: { probed: true, verified: true, value: true, evidenceDigest: 'malformed' },
          ssh: { probed: true, verified: true, value: true, evidenceDigest: 'abc' },
        },
      });

      expect(caps.docker).toBe('UNKNOWN');
      expect(caps.ssh).toBe('UNKNOWN');
    });
  });

  describe('2. Environment Twin Zero-Fabrication Invariants', () => {
    it('(b) discoverDirectAdminEnvironmentTwin with empty input {} produces 0 synthetic domain/db/ssl/backup/cost/health facts', () => {
      const twin = discoverDirectAdminEnvironmentTwin({});

      // Resources: Only the panel itself is present, NO fabricated database
      expect(twin.resources).toHaveLength(1);
      expect(twin.resources[0]?.type).toBe('HOSTING_PANEL');
      expect(twin.resources.filter((r) => r.type === 'DATABASE')).toHaveLength(0);

      // Databases & dependencies: 0 fabricated
      expect(twin.databases).toEqual([]);
      expect(twin.dependencies).toEqual([]);
      expect(twin.secretsReferences).toEqual([]);

      // Panel compute facts: 0 fabricated domains, apps, cron, or certs
      const panel = twin.compute.panels?.[0];
      expect(panel).toBeDefined();
      expect(panel?.domains).toEqual([]);
      expect(panel?.subdomains).toEqual([]);
      expect(panel?.databases).toEqual([]);
      expect(panel?.applications).toEqual([]);
      expect(panel?.cronJobs).toEqual([]);
      expect(panel?.sslCertificates).toEqual([]);
      expect(panel?.dnsZones).toEqual([]);
      expect(panel?.diskUsageMb).toBe(0);

      // Applications array
      expect(twin.applications).toEqual([]);

      // TLS certificates: empty
      expect(twin.tls.certificates).toEqual([]);

      // Backups: empty
      expect(twin.backups).toEqual([]);

      // Costs: reported as UNOBSERVED / UNKNOWN with undefined estimate
      expect(twin.costs.monthlyEstimate).toBeUndefined();
      expect(twin.costs.currency).toBe('UNKNOWN');
      expect(twin.costs.status).toBe('UNOBSERVED');

      // Health: reported as UNKNOWN, never synthetic HEALTHY
      expect(twin.health.status).toBe('UNKNOWN');

      // Recovery capabilities: unmeasured, all undefined
      expect(twin.recoveryCapabilities.rtoMinutes).toBeUndefined();
      expect(twin.recoveryCapabilities.rpoMinutes).toBeUndefined();
      expect(twin.recoveryCapabilities.testedAt).toBeUndefined();

      // Ownership: unassigned, undefined email
      expect(twin.ownership.teamId).toBe('UNASSIGNED');
      expect(twin.ownership.ownerEmail).toBeUndefined();

      // Evidence: empty when unprovided
      expect(twin.evidence).toEqual([]);
    });

    it('preserves verified operational facts when explicitly provided in input', () => {
      const now = Date.now();
      const twin = discoverDirectAdminEnvironmentTwin({
        environmentId: 'env-prod-da',
        tenantId: 'tenant-acme',
        phpVersion: '8.3',
        domains: ['acme.com'],
        subdomains: ['api.acme.com'],
        databases: ['acme_production'],
        databaseEngine: 'mariadb',
        databaseVersion: '10.11',
        sslCertificates: [
          { domain: 'acme.com', issuer: 'Let\'s Encrypt', expiresAt: now + 3600000 },
        ],
        backups: [
          { backupId: 'bak-01', status: 'ACTIVE', lastBackupAt: now - 3600, retentionDays: 30 },
        ],
        costs: {
          currency: 'EUR',
          monthlyEstimate: 29.5,
          lastUpdated: now,
          status: 'OBSERVED',
        },
        health: {
          status: 'HEALTHY',
          lastChecked: now,
          checkId: 'hc-custom',
        },
        recoveryCapabilities: {
          rtoMinutes: 60,
          rpoMinutes: 15,
          testedAt: now,
        },
        ownership: {
          teamId: 'team-ops',
          ownerEmail: 'lead@acme.com',
        },
      });

      expect(twin.environmentId).toBe('env-prod-da');
      expect(twin.tenantId).toBe('tenant-acme');
      expect(twin.databases).toHaveLength(1);
      expect(twin.databases[0]?.id).toBe('da-db-1');
      expect(twin.databases[0]?.engine).toBe('mariadb');
      expect(twin.databases[0]?.version).toBe('10.11');

      // Resource for database created
      expect(twin.resources.filter((r) => r.type === 'DATABASE')).toHaveLength(1);
      expect(twin.dependencies).toHaveLength(1);
      expect(twin.secretsReferences).toHaveLength(1);

      // TLS
      expect(twin.tls.certificates).toHaveLength(1);
      expect(twin.tls.certificates[0]?.valid).toBe(true);

      // Backups, costs, health, recovery, ownership
      expect(twin.backups).toHaveLength(1);
      expect(twin.costs.monthlyEstimate).toBe(29.5);
      expect(twin.health.status).toBe('HEALTHY');
      expect(twin.recoveryCapabilities.rtoMinutes).toBe(60);
      expect(twin.ownership.teamId).toBe('team-ops');
      expect(twin.ownership.ownerEmail).toBe('lead@acme.com');
    });

    it('Negative: false-positive TLS claim with expired certificate marks certificate as invalid', () => {
      const pastTime = Date.now() - 1000000;
      const twin = discoverDirectAdminEnvironmentTwin({
        sslCertificates: [
          { domain: 'expired.example.com', expiresAt: pastTime },
        ],
      });

      expect(twin.tls.certificates).toHaveLength(1);
      expect(twin.tls.certificates[0]?.valid).toBe(false);
    });

    it('Negative: throws error on tenant mismatch between input and expected tenant', () => {
      expect(() => {
        discoverDirectAdminEnvironmentTwin({
          tenantId: 'tenant-attacker',
          expectedTenantId: 'tenant-owner',
        });
      }).toThrow(/Tenant mismatch/);
    });

    it('Negative: malformed evidence items are filtered out to protect provenance integrity', () => {
      const now = Date.now();
      const twin = discoverDirectAdminEnvironmentTwin({
        evidence: [
          {
            evidenceId: 'ev-valid',
            type: 'CAPABILITY_PROBE',
            collectedAt: now,
            locationUrl: 'https://vault.internal/evidence/1',
          },
          {
            evidenceId: '',
            type: 'CAPABILITY_PROBE',
            collectedAt: now,
            locationUrl: 'https://vault.internal/evidence/2',
          },
          {
            evidenceId: 'ev-invalid-time',
            type: 'CAPABILITY_PROBE',
            collectedAt: 0,
            locationUrl: 'https://vault.internal/evidence/3',
          },
          {
            evidenceId: 'ev-malformed-url',
            type: 'CAPABILITY_PROBE',
            collectedAt: now,
            locationUrl: 'twin://malformed/location',
          },
        ],
      });

      expect(twin.evidence).toHaveLength(1);
      expect(twin.evidence[0]?.evidenceId).toBe('ev-valid');
    });
  });

  describe('3. Target Definition and DirectAdminTargetAdapter Specifications', () => {
    it('(e) Target definition metadata is strictly UNQUALIFIED and references discovery functions', () => {
      expect(Target.id).toBe('directadmin');
      expect(Target.name).toBe('DirectAdmin');
      expect(Target.status).toBe('UNQUALIFIED');
      expect(typeof Target.discoverCapabilities).toBe('function');
      expect(typeof Target.discoverEnvironmentTwin).toBe('function');
    });

    it('(e) DirectAdminTargetAdapter generates deterministic plan for valid target config', () => {
      const adapter = new DirectAdminTargetAdapter({
        targetId: 'da-target-01',
        serverHostname: 'da01.enterprise-host.net',
        username: 'acmeapp',
      });

      expect(adapter.getCapabilities()).toEqual([
        'FETCH_REPOSITORY',
        'SYNC_ENVIRONMENT',
        'COPY_FILE',
        'CREATE_DIRECTORY',
        'UPSELL_NOTICE',
      ]);

      const plan = adapter.generateDeploymentPlan('https://git.internal/acme/app.git', 'release-2.0');

      expect(plan.strategy).toBe('directadmin-sync');
      expect(plan.targetPath).toBe('/home/acmeapp/domains/public_html');
      expect(plan.steps).toHaveLength(2);
      expect(plan.steps[0]?.action).toBe('FETCH_REPOSITORY');
      expect(plan.steps[0]?.payload).toEqual({
        url: 'https://git.internal/acme/app.git',
        branch: 'release-2.0',
      });
      expect(plan.steps[1]?.action).toBe('SYNC_ENVIRONMENT');
      expect(plan.steps[1]?.payload).toEqual({
        strategy: 'directadmin-sync',
        destination: '/home/acmeapp/domains/public_html',
        preservePermissions: true,
      });
    });

    it('(e) DirectAdminTargetAdapter respects custom publicHtmlPath', () => {
      const adapter = new DirectAdminTargetAdapter({
        targetId: 'da-target-02',
        serverHostname: 'da02.enterprise-host.net',
        username: 'acmeapp',
        publicHtmlPath: '/home/acmeapp/domains/custom.com/public_html',
      });

      const plan = adapter.generateDeploymentPlan('https://git.internal/repo.git', 'main');
      expect(plan.targetPath).toBe('/home/acmeapp/domains/custom.com/public_html');
    });

    it('(e) DirectAdminTargetAdapter throws on missing required configuration fields', () => {
      expect(() => {
        new DirectAdminTargetAdapter({
          targetId: '',
          serverHostname: 'da.example.com',
          username: 'user1',
        });
      }).toThrow();

      expect(() => {
        new DirectAdminTargetAdapter({
          targetId: 'da-01',
          serverHostname: '',
          username: 'user1',
        });
      }).toThrow();

      expect(() => {
        new DirectAdminTargetAdapter({
          targetId: 'da-01',
          serverHostname: 'da.example.com',
          username: '',
        });
      }).toThrow();
    });
  });
});
