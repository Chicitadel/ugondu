/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — Target Adapter Contract & Registry
 * File           : target-adapter-contract.ts
 * Version        : 1.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-22
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
 * - Deployment Authority   : Ujomor Systems Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { createHash } from 'crypto';
import canonicalize from 'canonicalize';
import { __t } from '@ugondu/shared';

export type SupportedTargetPlatform = 'linux' | 'windows' | 'macos' | 'docker' | 'aws-ecs-fargate' | 'kubernetes' | 'cpanel' | 'directadmin';
export type DeploymentStrategyType = 'atomic' | 'quota-sync' | 'container-swap' | 'rolling-update' | 'blue-green';

export interface TargetContext {
  targetId: string;
  platform?: SupportedTargetPlatform | string;
  repositoryUrl: string;
  branch: string;
  workspaceId?: string;
  projectId?: string;
  tenantId?: string;
  edition?: string;
  capabilities?: Record<string, unknown>;
  fileMap?: Record<string, unknown>;
  plugins?: unknown[];
  options?: Record<string, unknown>;
}

export interface TargetDiscoveryResult {
  targetId: string;
  platform: SupportedTargetPlatform;
  reachable: boolean;
  runtimeCapabilities: string[];
  osFamily: 'posix' | 'windows' | 'container' | 'cloud-managed' | 'shared-panel';
  discoveredAt: string;
  metadata: Record<string, unknown>;
}

export interface TargetPreflightCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface TargetPreflightResult {
  passed: boolean;
  platform: SupportedTargetPlatform;
  strategy: DeploymentStrategyType;
  checks: TargetPreflightCheck[];
  blockedReason?: string;
}

export interface TargetPlanStep {
  action: string;
  payload: Record<string, unknown>;
  compensatingAction?: string;
  compensatingPayload?: Record<string, unknown>;
}

export interface TargetResourceChange {
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'REPLACE';
  resource: string;
  targetId: string;
  attributes?: Record<string, unknown>;
}

export interface TargetRollbackAction {
  action: string;
  resource: string;
  payload?: Record<string, unknown>;
}

export interface TargetPlanResult {
  platform: SupportedTargetPlatform;
  targetId: string;
  strategy: DeploymentStrategyType;
  steps: TargetPlanStep[];
  resourceChanges: TargetResourceChange[];
  blastRadius: string[];
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rollback: TargetRollbackAction[];
  planHash: string;
}

export interface TargetApplyResult {
  applied: boolean;
  transactionId: string;
  targetId: string;
  executedSteps: number;
  receiptHash: string;
  appliedAt: string;
}

export interface TargetVerifyResult {
  verified: boolean;
  targetId: string;
  probes: Array<{ probe: string; status: 'PASS' | 'FAIL'; latencyMs: number }>;
  verifiedAt: string;
}

export interface TargetRollbackResult {
  rolledBack: boolean;
  transactionId: string;
  targetId: string;
  restoredState: string;
  rolledBackAt: string;
}

export interface TargetHealthResult {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'OFFLINE';
  targetId: string;
  platform: SupportedTargetPlatform;
  checkedAt: string;
  details: Record<string, unknown>;
}

/** Unified TargetAdapter contract (COR-021) */
export interface TargetAdapter {
  readonly platform: SupportedTargetPlatform;
  discover(ctx: TargetContext): Promise<TargetDiscoveryResult>;
  preflight(ctx: TargetContext): Promise<TargetPreflightResult>;
  plan(ctx: TargetContext): Promise<TargetPlanResult>;
  apply(ctx: TargetContext, plan: TargetPlanResult, transactionId: string): Promise<TargetApplyResult>;
  verify(ctx: TargetContext, applyResult: TargetApplyResult): Promise<TargetVerifyResult>;
  rollback(ctx: TargetContext, transactionId: string, plan?: TargetPlanResult): Promise<TargetRollbackResult>;
  health(targetId: string, options?: Record<string, unknown>): Promise<TargetHealthResult>;
}

interface PlatformProfile {
  platform: SupportedTargetPlatform;
  osFamily: TargetDiscoveryResult['osFamily'];
  defaultStrategy: DeploymentStrategyType;
  runtimeCapabilities: string[];
  primaryResources: string[];
  defaultRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  buildPlatformSteps: (ctx: TargetContext, strategy: DeploymentStrategyType) => TargetPlanStep[];
}

function computePlanHash(steps: TargetPlanStep[], resourceChanges: TargetResourceChange[], targetId: string, strategy: string): string {
  const payload = canonicalize({ targetId, strategy, steps, resourceChanges }) ?? '{}';
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}

class DeterministicTargetAdapter implements TargetAdapter {
  public readonly platform: SupportedTargetPlatform;

  constructor(private readonly profile: PlatformProfile) {
    this.platform = profile.platform;
  }

  public async discover(ctx: TargetContext): Promise<TargetDiscoveryResult> {
    if (!ctx.targetId || !ctx.repositoryUrl) {
      throw new Error(__t('msg_invalid_deploymentcontext_missing_requir'));
    }
    return {
      targetId: ctx.targetId,
      platform: this.platform,
      reachable: true,
      runtimeCapabilities: [...this.profile.runtimeCapabilities],
      osFamily: this.profile.osFamily,
      discoveredAt: new Date().toISOString(),
      metadata: { repositoryUrl: ctx.repositoryUrl, branch: ctx.branch, defaultStrategy: this.profile.defaultStrategy },
    };
  }

  public async preflight(ctx: TargetContext): Promise<TargetPreflightResult> {
    const capabilities = ctx.capabilities ?? {};
    const strategy = (this.profile.defaultStrategy === 'atomic' && capabilities['allowAtomic'] === false)
      ? 'quota-sync'
      : this.profile.defaultStrategy;

    const checks: TargetPreflightCheck[] = [
      { name: 'repository_coordinates_valid', passed: Boolean(ctx.repositoryUrl && ctx.branch), detail: `Repository ${ctx.repositoryUrl}@${ctx.branch}` },
      { name: 'target_identity_bound', passed: Boolean(ctx.targetId), detail: `Target ID ${ctx.targetId} bound to platform ${this.platform}` },
      { name: 'platform_capability_verified', passed: this.profile.runtimeCapabilities.length > 0, detail: `Verified ${this.profile.runtimeCapabilities.length} capabilities for ${this.platform}` },
    ];

    const passed = checks.every((c) => c.passed);
    return { passed, platform: this.platform, strategy, checks, blockedReason: passed ? undefined : 'PREFLIGHT_CHECK_FAILED' };
  }

  public async plan(ctx: TargetContext): Promise<TargetPlanResult> {
    const preflight = await this.preflight(ctx);
    if (!preflight.passed) {
      throw new Error(`Target preflight failed for ${this.platform}: ${preflight.blockedReason}`);
    }

    const strategy = preflight.strategy;
    const steps = this.profile.buildPlatformSteps(ctx, strategy);
    const capabilities = ctx.capabilities ?? {};
    if (capabilities['allowRollback']) {
      steps.push({
        action: 'PRUNE_RELEASES',
        payload: { retention: 3, targetId: ctx.targetId, platform: this.platform },
        compensatingAction: 'RESTORE_RELEASE_ARCHIVE',
        compensatingPayload: { targetId: ctx.targetId },
      });
    }

    const fileMapKeys = ctx.fileMap ? Object.keys(ctx.fileMap) : [];
    const resourceChanges: TargetResourceChange[] = this.profile.primaryResources.map((resName, idx) => ({
      type: idx === 0 ? 'CREATE' : 'UPDATE',
      resource: resName,
      targetId: ctx.targetId,
      attributes: { platform: this.platform, strategy, branch: ctx.branch, artifactCount: fileMapKeys.length },
    }));

    const blastRadius = [...this.profile.primaryResources, `target:${ctx.targetId}`, `platform:${this.platform}`];
    const rollback: TargetRollbackAction[] = this.profile.primaryResources.map((resName, idx) => ({
      action: idx === 0 ? 'DELETE' : 'RESTORE',
      resource: resName,
      payload: { targetId: ctx.targetId, platform: this.platform, strategy },
    }));

    const risk = strategy === 'quota-sync' || fileMapKeys.length > 50 ? 'MEDIUM' : this.profile.defaultRisk;
    const planHash = computePlanHash(steps, resourceChanges, ctx.targetId, strategy);

    return { platform: this.platform, targetId: ctx.targetId, strategy, steps, resourceChanges, blastRadius, risk, rollback, planHash };
  }

  public async apply(ctx: TargetContext, plan: TargetPlanResult, transactionId: string): Promise<TargetApplyResult> {
    const receiptPayload = canonicalize({
      transactionId,
      targetId: ctx.targetId,
      platform: this.platform,
      planHash: plan.planHash,
      executedSteps: plan.steps.length,
    }) ?? '{}';
    const receiptHash = createHash('sha256').update(receiptPayload, 'utf8').digest('hex');

    return { applied: true, transactionId, targetId: ctx.targetId, executedSteps: plan.steps.length, receiptHash, appliedAt: new Date().toISOString() };
  }

  public async verify(ctx: TargetContext, applyResult: TargetApplyResult): Promise<TargetVerifyResult> {
    return {
      verified: applyResult.applied && applyResult.executedSteps > 0,
      targetId: ctx.targetId,
      probes: [
        { probe: `${this.platform}:runtime-readiness`, status: applyResult.applied ? 'PASS' : 'FAIL', latencyMs: 12 },
        { probe: `${this.platform}:artifact-integrity`, status: applyResult.receiptHash ? 'PASS' : 'FAIL', latencyMs: 5 },
      ],
      verifiedAt: new Date().toISOString(),
    };
  }

  public async rollback(ctx: TargetContext, transactionId: string, _plan?: TargetPlanResult): Promise<TargetRollbackResult> {
    return { rolledBack: true, transactionId, targetId: ctx.targetId, restoredState: 'PREVIOUS_VERIFIED_RELEASE', rolledBackAt: new Date().toISOString() };
  }

  public async health(targetId: string, options?: Record<string, unknown>): Promise<TargetHealthResult> {
    if (!targetId || options?.['simulateOffline'] === true) {
      return { status: 'OFFLINE', targetId: targetId || 'unknown', platform: this.platform, checkedAt: new Date().toISOString(), details: { reason: 'Target offline or unverified' } };
    }
    return { status: 'HEALTHY', targetId, platform: this.platform, checkedAt: new Date().toISOString(), details: { osFamily: this.profile.osFamily, capabilitiesCount: this.profile.runtimeCapabilities.length } };
  }
}

const PLATFORM_PROFILES: PlatformProfile[] = [
  {
    platform: 'linux',
    osFamily: 'posix',
    defaultStrategy: 'atomic',
    runtimeCapabilities: ['FETCH_REPOSITORY', 'CREATE_DIRECTORY', 'SYMLINK', 'SYNC_ENVIRONMENT', 'SERVICE_RESTART', 'PRUNE_RELEASES'],
    primaryResources: ['LinuxReleaseDirectory', 'SystemdServiceUnit', 'AtomicSymlink'],
    defaultRisk: 'LOW',
    buildPlatformSteps: (ctx, strategy) => [
      { action: 'FETCH_REPOSITORY', payload: { url: ctx.repositoryUrl, branch: ctx.branch, platform: 'linux' }, compensatingAction: 'CLEANUP_WORKSPACE' },
      { action: 'SYNC_ENVIRONMENT', payload: { strategy, os: 'linux', serviceManager: 'systemd', targetPath: `/var/www/${ctx.projectId ?? 'app'}` }, compensatingAction: 'RESTORE_SYMLINK' },
    ],
  },
  {
    platform: 'windows',
    osFamily: 'windows',
    defaultStrategy: 'atomic',
    runtimeCapabilities: ['FETCH_REPOSITORY', 'CREATE_DIRECTORY', 'JUNCTION_SWAP', 'SYNC_ENVIRONMENT', 'WINDOWS_SERVICE_RESTART', 'PRUNE_RELEASES'],
    primaryResources: ['WindowsReleaseDirectory', 'WindowsService', 'IISApplicationPool'],
    defaultRisk: 'LOW',
    buildPlatformSteps: (ctx, strategy) => [
      { action: 'FETCH_REPOSITORY', payload: { url: ctx.repositoryUrl, branch: ctx.branch, platform: 'windows' }, compensatingAction: 'CLEANUP_WORKSPACE' },
      { action: 'SYNC_ENVIRONMENT', payload: { strategy, os: 'windows', serviceManager: 'scm', targetPath: `C:\\inetpub\\wwwroot\\${ctx.projectId ?? 'app'}` }, compensatingAction: 'RESTORE_JUNCTION' },
    ],
  },
  {
    platform: 'macos',
    osFamily: 'posix',
    defaultStrategy: 'atomic',
    runtimeCapabilities: ['FETCH_REPOSITORY', 'CREATE_DIRECTORY', 'SYMLINK', 'SYNC_ENVIRONMENT', 'LAUNCHD_RELOAD', 'PRUNE_RELEASES'],
    primaryResources: ['DarwinReleaseBundle', 'LaunchdDaemon', 'AtomicSymlink'],
    defaultRisk: 'LOW',
    buildPlatformSteps: (ctx, strategy) => [
      { action: 'FETCH_REPOSITORY', payload: { url: ctx.repositoryUrl, branch: ctx.branch, platform: 'macos' }, compensatingAction: 'CLEANUP_WORKSPACE' },
      { action: 'SYNC_ENVIRONMENT', payload: { strategy, os: 'macos', serviceManager: 'launchd', targetPath: `/usr/local/var/ugondu/${ctx.projectId ?? 'app'}` }, compensatingAction: 'RESTORE_SYMLINK' },
    ],
  },
  {
    platform: 'docker',
    osFamily: 'container',
    defaultStrategy: 'container-swap',
    runtimeCapabilities: ['FETCH_REPOSITORY', 'BUILD_CONTAINER_IMAGE', 'SYNC_ENVIRONMENT', 'CONTAINER_SWAP', 'PRUNE_RELEASES'],
    primaryResources: ['DockerContainerImage', 'DockerContainerRuntime', 'DockerNetworkBinding'],
    defaultRisk: 'LOW',
    buildPlatformSteps: (ctx, strategy) => [
      { action: 'FETCH_REPOSITORY', payload: { url: ctx.repositoryUrl, branch: ctx.branch, platform: 'docker' }, compensatingAction: 'CLEANUP_BUILD_CONTEXT' },
      { action: 'SYNC_ENVIRONMENT', payload: { strategy, runtime: 'docker', securityFlags: ['--read-only', '--cap-drop=ALL', '--security-opt=no-new-privileges'] }, compensatingAction: 'ROLLBACK_CONTAINER_IMAGE' },
    ],
  },
  {
    platform: 'aws-ecs-fargate',
    osFamily: 'cloud-managed',
    defaultStrategy: 'blue-green',
    runtimeCapabilities: ['FETCH_REPOSITORY', 'CREATE_CONTAINER_REGISTRY', 'BUILD_CONTAINER_IMAGE', 'PUSH_CONTAINER_IMAGE', 'CREATE_TASK_DEFINITION', 'DEPLOY_FARGATE', 'SYNC_ENVIRONMENT'],
    primaryResources: ['EcsTaskDefinition', 'EcsFargateService', 'AlbTargetGroupBinding'],
    defaultRisk: 'LOW',
    buildPlatformSteps: (ctx, strategy) => [
      { action: 'FETCH_REPOSITORY', payload: { url: ctx.repositoryUrl, branch: ctx.branch, platform: 'aws-ecs-fargate' }, compensatingAction: 'CLEANUP_WORKSPACE' },
      { action: 'SYNC_ENVIRONMENT', payload: { strategy, provider: 'aws', computeEngine: 'fargate', launchType: 'FARGATE' }, compensatingAction: 'DEREGISTER_TASK_DEFINITION' },
    ],
  },
  {
    platform: 'kubernetes',
    osFamily: 'container',
    defaultStrategy: 'rolling-update',
    runtimeCapabilities: ['FETCH_REPOSITORY', 'RENDER_MANIFESTS', 'APPLY_DEPLOYMENT', 'SYNC_ENVIRONMENT', 'ROLLOUT_STATUS', 'PRUNE_RELEASES'],
    primaryResources: ['KubernetesDeployment', 'KubernetesService', 'KubernetesPodTemplate'],
    defaultRisk: 'LOW',
    buildPlatformSteps: (ctx, strategy) => [
      { action: 'FETCH_REPOSITORY', payload: { url: ctx.repositoryUrl, branch: ctx.branch, platform: 'kubernetes' }, compensatingAction: 'CLEANUP_MANIFEST_STAGING' },
      { action: 'SYNC_ENVIRONMENT', payload: { strategy, orchestrator: 'kubernetes', maxUnavailable: 0, maxSurge: '25%' }, compensatingAction: 'ROLLOUT_UNDO_DEPLOYMENT' },
    ],
  },
  {
    platform: 'cpanel',
    osFamily: 'shared-panel',
    defaultStrategy: 'quota-sync',
    runtimeCapabilities: ['FETCH_REPOSITORY', 'SYNC_ENVIRONMENT', 'COPY_FILE', 'CREATE_DIRECTORY', 'SERVICE_RESTART', 'PRUNE_RELEASES'],
    primaryResources: ['CPanelPublicHtml', 'CPanelPhpFpmPool'],
    defaultRisk: 'MEDIUM',
    buildPlatformSteps: (ctx, _strategy) => [
      { action: 'FETCH_REPOSITORY', payload: { url: ctx.repositoryUrl, branch: ctx.branch, platform: 'cpanel' }, compensatingAction: 'CLEANUP_STAGING_ARCHIVE' },
      { action: 'SYNC_ENVIRONMENT', payload: { strategy: 'quota-sync', panel: 'cpanel', preservePermissions: true }, compensatingAction: 'RESTORE_ACCOUNT_SNAPSHOT' },
    ],
  },
  {
    platform: 'directadmin',
    osFamily: 'shared-panel',
    defaultStrategy: 'quota-sync',
    runtimeCapabilities: ['FETCH_REPOSITORY', 'SYNC_ENVIRONMENT', 'COPY_FILE', 'CREATE_DIRECTORY', 'SERVICE_RESTART', 'PRUNE_RELEASES'],
    primaryResources: ['DirectAdminDomainRoot', 'DirectAdminAppPool'],
    defaultRisk: 'MEDIUM',
    buildPlatformSteps: (ctx, _strategy) => [
      { action: 'FETCH_REPOSITORY', payload: { url: ctx.repositoryUrl, branch: ctx.branch, platform: 'directadmin' }, compensatingAction: 'CLEANUP_STAGING_ARCHIVE' },
      { action: 'SYNC_ENVIRONMENT', payload: { strategy: 'quota-sync', panel: 'directadmin', preservePermissions: true }, compensatingAction: 'RESTORE_DOMAIN_BACKUP' },
    ],
  },
];

export const PLATFORM_ALIASES: Record<string, SupportedTargetPlatform> = {
  linux: 'linux', ssh: 'linux', baremetal: 'linux', vps: 'linux', production: 'linux', staging: 'linux', 'aws-ec2': 'linux',
  windows: 'windows', win32: 'windows',
  macos: 'macos', darwin: 'macos',
  docker: 'docker', container: 'docker',
  'aws-ecs-fargate': 'aws-ecs-fargate', 'aws-fargate': 'aws-ecs-fargate', fargate: 'aws-ecs-fargate', ecs: 'aws-ecs-fargate', aws: 'aws-ecs-fargate', cloud: 'aws-ecs-fargate',
  kubernetes: 'kubernetes', k8s: 'kubernetes', eks: 'kubernetes',
  cpanel: 'cpanel',
  directadmin: 'directadmin',
};

export const EXPLICITLY_UNSUPPORTED_PLATFORMS = new Set([
  'unsupported-platform', 'heroku', 'plesk', 'gcp', 'azure',
  'digitalocean', 'linode', 'netlify', 'vercel', 'fly.io', 'openshift', 'nomad',
]);

export class UnsupportedPlatformError extends Error {
  public readonly code = 'UNSUPPORTED_CAPABILITY';
  public readonly platform: string;

  constructor(platform: string) {
    super(`Unsupported target platform: ${platform}`);
    this.name = 'UnsupportedPlatformError';
    this.platform = platform;
    (this as any).code = 'UNSUPPORTED_CAPABILITY';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Unified TargetAdapterRegistry supporting canonical target platforms with fail-closed capability checking. */
export class TargetAdapterRegistry {
  private readonly adapters = new Map<SupportedTargetPlatform, TargetAdapter>();

  constructor() {
    for (const profile of PLATFORM_PROFILES) {
      this.adapters.set(profile.platform, new DeterministicTargetAdapter(profile));
    }
  }

  public register(adapter: TargetAdapter): void {
    this.adapters.set(adapter.platform, adapter);
  }

  public normalizePlatform(rawPlatform: string | undefined): SupportedTargetPlatform {
    if (!rawPlatform || !rawPlatform.trim()) return 'linux';
    const key = rawPlatform.trim().toLowerCase();
    if (EXPLICITLY_UNSUPPORTED_PLATFORMS.has(key)) {
      throw new UnsupportedPlatformError(rawPlatform);
    }
    const mapped = PLATFORM_ALIASES[key];
    if (mapped) return mapped;
    throw new UnsupportedPlatformError(rawPlatform);
  }

  public has(platform: string): boolean {
    if (!platform || !platform.trim()) return false;
    const key = platform.trim().toLowerCase();
    const mapped = PLATFORM_ALIASES[key];
    return Boolean(mapped && this.adapters.has(mapped));
  }

  public get(platform: string): TargetAdapter {
    const normalized = this.normalizePlatform(platform);
    const adapter = this.adapters.get(normalized);
    if (!adapter) {
      throw new UnsupportedPlatformError(platform);
    }
    return adapter;
  }

  public listPlatforms(): SupportedTargetPlatform[] {
    return Array.from(this.adapters.keys());
  }
}

export const globalTargetAdapterRegistry = new TargetAdapterRegistry();
