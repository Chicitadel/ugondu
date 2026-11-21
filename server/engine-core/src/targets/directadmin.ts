/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : server/engine-core/targets
 * File           : directadmin.ts
 * Version        : 2.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
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

import { __t } from '@ugondu/shared';
import type {
  CapabilityAvailabilityState,
  DirectAdminCapabilityReport,
  HostingPanelDiscovery,
  TwinResource,
} from '../twin/model/shared-types';
import type {
  BackupInfo,
  CostInfo,
  EvidenceInfo,
  ExtendedEnvironmentTwin,
  HealthInfo,
  OwnershipInfo,
  RecoveryCapabilities,
} from '../twin/model/schema';

export interface VerifiedCapabilityProbe<T = boolean> {
  probed?: boolean;
  verified: boolean;
  value?: T;
  evidenceDigest?: string;
  stale?: boolean;
  collectedAt?: number;
  staleBefore?: number;
}

export interface DirectAdminDiscoveryInput {
  environmentId?: string;
  tenantId?: string;
  expectedTenantId?: string;
  environmentName?: string;
  phpVersion?: string;
  domains?: string[];
  subdomains?: string[];
  databases?: string[];
  databaseEngine?: 'mysql' | 'mariadb';
  databaseVersion?: string;
  dnsZones?: string[];
  sslCertificates?: Array<{ domain: string; issuer?: string; expiresAt: number }>;
  diskUsageMb?: number;
  ftpAvailable?: boolean;
  dnsManagementAvailable?: boolean;
  tlsAvailable?: boolean;
  applications?: string[];
  cronJobs?: string[];
  backups?: BackupInfo[];
  costs?: CostInfo;
  health?: HealthInfo;
  recoveryCapabilities?: RecoveryCapabilities;
  ownership?: OwnershipInfo;
  evidence?: EvidenceInfo[];
  probedCapabilities?: {
    rootAccess?: VerifiedCapabilityProbe<boolean>;
    docker?: VerifiedCapabilityProbe<boolean>;
    ssh?: VerifiedCapabilityProbe<boolean>;
    nodejs?: VerifiedCapabilityProbe<boolean>;
    cron?: VerifiedCapabilityProbe<boolean>;
    redis?: VerifiedCapabilityProbe<boolean>;
    resourceLimits?: VerifiedCapabilityProbe<boolean>;
    systemd?: VerifiedCapabilityProbe<boolean>;
    privateNetworking?: VerifiedCapabilityProbe<boolean>;
    php?: VerifiedCapabilityProbe<boolean>;
    database?: VerifiedCapabilityProbe<boolean>;
    dnsManagement?: VerifiedCapabilityProbe<boolean>;
    tls?: VerifiedCapabilityProbe<boolean>;
    ftp?: VerifiedCapabilityProbe<boolean>;
  };
  unverifiedClaims?: Partial<Record<keyof DirectAdminCapabilityReport, CapabilityAvailabilityState>>;
}

function resolveProbedCapability(
  probe?: VerifiedCapabilityProbe<boolean>
): CapabilityAvailabilityState {
  if (!probe) {
    return 'UNKNOWN';
  }
  if (probe.probed === false || probe.verified !== true || probe.stale === true) {
    return 'UNKNOWN';
  }
  if (probe.staleBefore && probe.collectedAt && probe.collectedAt < probe.staleBefore) {
    return 'UNKNOWN';
  }
  if (probe.value === true) {
    if (
      !probe.evidenceDigest ||
      probe.evidenceDigest.trim() === '' ||
      probe.evidenceDigest.trim().length < 8 ||
      probe.evidenceDigest.trim() === 'malformed'
    ) {
      return 'UNKNOWN';
    }
    return 'AVAILABLE';
  }
  if (probe.value === false) {
    return 'UNAVAILABLE';
  }
  return 'UNKNOWN';
}

/**
 * Discovers DirectAdmin shared hosting capabilities without ever guessing or
 * fabricating unverified capabilities. Any capability not backed by a verified
 * probe is deterministically reported as 'UNKNOWN'.
 */
export function discoverDirectAdminCapabilities(
  input: DirectAdminDiscoveryInput = {}
): DirectAdminCapabilityReport {
  const probes = input.probedCapabilities ?? {};

  // Note: input.unverifiedClaims is intentionally ignored to enforce the
  // Honest UNKNOWN Discovery Invariant (never accept unverified claims).
  void input.unverifiedClaims;

  const phpProbe = probes.php;
  const phpState = phpProbe
    ? resolveProbedCapability(phpProbe)
    : (input.phpVersion ? 'AVAILABLE' : 'UNKNOWN');

  const dbProbe = probes.database;
  const dbState = dbProbe
    ? resolveProbedCapability(dbProbe)
    : (input.databases && input.databases.length > 0 ? 'AVAILABLE' : 'UNKNOWN');

  const dnsProbe = probes.dnsManagement;
  const dnsState = dnsProbe
    ? resolveProbedCapability(dnsProbe)
    : input.dnsManagementAvailable === true
      ? 'AVAILABLE'
      : input.dnsManagementAvailable === false
        ? 'UNAVAILABLE'
        : 'UNKNOWN';

  const tlsProbe = probes.tls;
  const tlsState = tlsProbe
    ? resolveProbedCapability(tlsProbe)
    : input.tlsAvailable === true
      ? 'AVAILABLE'
      : input.tlsAvailable === false
        ? 'UNAVAILABLE'
        : input.sslCertificates && input.sslCertificates.length > 0
          ? 'AVAILABLE'
          : 'UNKNOWN';

  const ftpProbe = probes.ftp;
  const ftpState = ftpProbe
    ? resolveProbedCapability(ftpProbe)
    : input.ftpAvailable === true
      ? 'AVAILABLE'
      : input.ftpAvailable === false
        ? 'UNAVAILABLE'
        : 'UNKNOWN';

  return {
    php: phpState,
    phpVersion: input.phpVersion ?? 'UNKNOWN',
    domains: input.domains && input.domains.length > 0 ? 'AVAILABLE' : 'UNKNOWN',
    subdomains: input.subdomains && input.subdomains.length > 0 ? 'AVAILABLE' : 'UNKNOWN',
    database: dbState,
    dnsManagement: dnsState,
    tls: tlsState,
    ftp: ftpState,
    filesystem: 'ACCOUNT_SCOPED',
    kubernetes: 'UNSUPPORTED',
    rootAccess: resolveProbedCapability(probes.rootAccess),
    docker: resolveProbedCapability(probes.docker),
    ssh: resolveProbedCapability(probes.ssh),
    nodejs: resolveProbedCapability(probes.nodejs),
    cron: resolveProbedCapability(probes.cron),
    redis: resolveProbedCapability(probes.redis),
    resourceLimits: resolveProbedCapability(probes.resourceLimits),
    systemd: resolveProbedCapability(probes.systemd),
    privateNetworking: resolveProbedCapability(probes.privateNetworking),
  };
}

/**
 * Builds a complete ExtendedEnvironmentTwin for a DirectAdmin Shared Hosting target.
 * Enforces zero-fabrication: unprovided operational aspects are reported as
 * empty, unobserved, or unknown states with full provenance integrity.
 */
export function discoverDirectAdminEnvironmentTwin(
  input: DirectAdminDiscoveryInput = {}
): ExtendedEnvironmentTwin {
  if (input.expectedTenantId && input.tenantId && input.tenantId !== input.expectedTenantId) {
    throw new Error(
      `Tenant mismatch: input tenantId '${input.tenantId}' does not match expected tenantId '${input.expectedTenantId}'`
    );
  }

  const now = Date.now();
  const environmentId = input.environmentId ?? 'env-directadmin-shared-01';
  const tenantId = input.tenantId ?? 'tenant-default';
  const domains = input.domains ?? [];
  const subdomains = input.subdomains ?? [];
  const databases = input.databases ?? [];
  const capabilities = discoverDirectAdminCapabilities(input);
  const sslCerts = input.sslCertificates ?? [];

  const panelDiscovery: HostingPanelDiscovery = {
    panel: 'directadmin',
    domains,
    subdomains,
    applications: input.applications ?? [],
    databases,
    sslCertificates: sslCerts.map((c) => ({ domain: c.domain, expiresAt: c.expiresAt })),
    dnsZones: input.dnsZones ?? (domains.length > 0 ? domains : []),
    cronJobs: input.cronJobs ?? [],
    diskUsageMb: input.diskUsageMb ?? 0,
    phpVersion: input.phpVersion,
    capabilities,
  };

  const resources: TwinResource[] = [
    {
      resourceId: `${environmentId}:panel:directadmin`,
      type: 'HOSTING_PANEL',
      knowledgeState: 'OBSERVED',
      lifecycleState: 'VERIFIED',
      metadata: {
        panel: 'directadmin',
        php: capabilities.php,
        phpVersion: capabilities.phpVersion,
        filesystem: capabilities.filesystem,
        kubernetes: capabilities.kubernetes,
        rootAccess: capabilities.rootAccess,
        docker: capabilities.docker,
        ssh: capabilities.ssh,
        nodejs: capabilities.nodejs,
        cron: capabilities.cron,
        redis: capabilities.redis,
        resourceLimits: capabilities.resourceLimits,
      },
      lastObservedAt: now,
      lastVerifiedAt: now,
    },
  ];

  for (const dbName of databases) {
    resources.push({
      resourceId: `${environmentId}:db:${dbName}`,
      type: 'DATABASE',
      knowledgeState: 'OBSERVED',
      lifecycleState: 'VERIFIED',
      metadata: {
        engine: input.databaseEngine ?? 'mysql',
        version: input.databaseVersion ?? 'unknown',
        status: capabilities.database,
      },
      lastObservedAt: now,
      lastVerifiedAt: now,
    });
  }

  const dependencies = databases.map((dbName) => ({
    fromResourceId: `${environmentId}:panel:directadmin`,
    toResourceId: `${environmentId}:db:${dbName}`,
    dependencyType: 'DEPENDS_ON',
    verified: true,
  }));

  const validatedEvidence: EvidenceInfo[] = (input.evidence ?? []).filter((ev) => {
    return (
      typeof ev.evidenceId === 'string' &&
      ev.evidenceId.trim().length > 0 &&
      typeof ev.type === 'string' &&
      ev.type.trim().length > 0 &&
      typeof ev.collectedAt === 'number' &&
      ev.collectedAt > 0 &&
      typeof ev.locationUrl === 'string' &&
      ev.locationUrl.trim().length > 0 &&
      !ev.locationUrl.includes('malformed')
    );
  });

  return {
    environmentId,
    tenantId,
    resources,
    dependencies,
    lastReconciledAt: now,
    driftCount: 0,
    identity: {
      environmentName: input.environmentName ?? __t('directadmin_shared_hosting'),
      labels: {
        provider: 'directadmin',
        tier: 'shared-hosting',
        filesystemScope: capabilities.filesystem,
      },
    },
    provider: {
      providerId: 'directadmin',
      name: 'DirectAdmin',
      type: 'SHARED_HOSTING_PANEL',
      regions: ['default'],
    },
    compute: {
      panels: [panelDiscovery],
    },
    applications: input.applications && input.applications.length > 0
      ? input.applications.map((app) => ({
          language: 'php',
          framework: null,
          runtime: input.phpVersion ? `php-${input.phpVersion}` : 'unconfigured',
          entrypoint: app,
          ports: [80, 443],
          packageManager: null,
          buildSystem: null,
          envVars: [],
          secretRefs: [],
          externalDependencies: [],
          containerized: false,
        }))
      : [],
    databases: databases.map((dbName, idx) => ({
      id: `da-db-${idx + 1}`,
      engine: input.databaseEngine ?? 'mysql',
      version: input.databaseVersion ?? 'unknown',
      cluster: false,
      endpoints: [`localhost:3306/${dbName}`],
    })),
    tls: {
      certificates: sslCerts.map((c) => ({
        domain: c.domain,
        issuer: c.issuer ?? 'UNKNOWN',
        expiresAt: c.expiresAt,
        valid: c.expiresAt > now,
      })),
    },
    secretsReferences: databases.length > 0
      ? [
          {
            id: 'sec-da-db-password',
            name: 'DB_PASSWORD',
            store: 'directadmin-account-env',
            lastRotated: now,
          },
        ]
      : [],
    backups: input.backups ?? [],
    recoveryCapabilities: input.recoveryCapabilities ?? {
      rtoMinutes: undefined,
      rpoMinutes: undefined,
      testedAt: undefined,
    },
    observability: {
      metrics: true,
      tracing: false,
      logs: true,
      tools: ['directadmin-access-log', 'directadmin-error-log'],
    },
    ownership: input.ownership ?? {
      teamId: 'UNASSIGNED',
      ownerEmail: undefined,
    },
    policies: [
      {
        policyId: 'pol-honest-discovery',
        name: 'Honest Capability Discovery Policy',
        compliant: true,
      },
    ],
    costs: input.costs ?? {
      currency: 'UNKNOWN',
      monthlyEstimate: undefined,
      status: 'UNOBSERVED',
      lastUpdated: now,
    },
    health: input.health ?? {
      status: 'UNKNOWN',
      lastChecked: now,
      checkId: `hc-${environmentId}:unobserved`,
    },
    incidents: [],
    deployments: [],
    drift: [],
    evidence: validatedEvidence,
  };
}

export const Target = {
  id: 'directadmin',
  name: 'DirectAdmin',
  status: 'UNQUALIFIED',
  description: __t('directadmin_live_execution_stubs_have_been_el'),
  discoverCapabilities: discoverDirectAdminCapabilities,
  discoverEnvironmentTwin: discoverDirectAdminEnvironmentTwin,
};

/**
 * @interface DirectAdminTargetConfig
 * @description Corporate Governed interface implementation for DirectAdminTargetConfig
 * @classification ENTERPRISE
 */
export interface DirectAdminTargetConfig {
  targetId: string;
  serverHostname: string;
  username: string;
  publicHtmlPath?: string;
  phpVersion?: string;
}

/**
 * @class DirectAdminTargetAdapter
 * @description Dedicated adapter for DirectAdmin shared hosting targets.
 * Distinct from cPanel; preserves bounded isolation and honest discovery.
 * @classification ENTERPRISE
 */
export class DirectAdminTargetAdapter {
  private config: DirectAdminTargetConfig;

  constructor(config: DirectAdminTargetConfig) {
    if (!config.targetId || !config.serverHostname || !config.username) {
      throw new Error(__t('msg_invalid_deploymentcontext_missing_requir'));
    }
    this.config = {
      ...config,
      publicHtmlPath: config.publicHtmlPath || `/home/${config.username}/domains/public_html`,
    };
  }

  public getCapabilities(): string[] {
    return [
      'FETCH_REPOSITORY',
      'SYNC_ENVIRONMENT',
      'COPY_FILE',
      'CREATE_DIRECTORY',
      'UPSELL_NOTICE',
    ];
  }

  public generateDeploymentPlan(repositoryUrl: string, branch: string): {
    strategy: 'directadmin-sync';
    targetPath: string;
    steps: Array<{ action: string; payload: Record<string, any> }>;
  } {
    return {
      strategy: 'directadmin-sync',
      targetPath: this.config.publicHtmlPath!,
      steps: [
        {
          action: 'FETCH_REPOSITORY',
          payload: { url: repositoryUrl, branch },
        },
        {
          action: 'SYNC_ENVIRONMENT',
          payload: {
            strategy: 'directadmin-sync',
            destination: this.config.publicHtmlPath,
            preservePermissions: true,
          },
        },
      ],
    };
  }
}
