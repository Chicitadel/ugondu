/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Central Configuration & Secret Registry
 * File           : config-registry.ts
 * Version        : 4.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU / Ujomor Engineering
 * Created Date   : 2026-10-18
 * Last Modified  : 2026-10-18
 * Classification : GOVERNMENT | ENTERPRISE | INTERNAL
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
 * - SOC 2 Type II
 * - OWASP ASVS 5.0
 * - NIST SP 800-53
 *
 * Signatures:
 * - Architecture Authority
 * - Security Authority
 * - Governance Authority
 * - Deployment Authority
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import { ProductRegistry } from './product-registry';

export const ALLOWED_ENVIRONMENTS = [
  'development',
  'test',
  'staging',
  'production'
] as const;

export type RuntimeEnvironment = typeof ALLOWED_ENVIRONMENTS[number];

export const SUPPORTED_SECRET_SCHEMES = [
  'secretless-registry://',
  'aws-secrets://',
  'kms://',
  'env://'
] as const;

export type SecretScheme = typeof SUPPORTED_SECRET_SCHEMES[number];

export type ConfigProvenanceSource =
  | 'RUNTIME_OVERRIDE'
  | 'SECRET_REFERENCE'
  | 'ENVIRONMENT_VARIABLE'
  | 'GOVERNANCE_REGISTRY'
  | 'DEFAULT_FALLBACK';

export const CONFIG_PRECEDENCE_ORDER: ReadonlyArray<ConfigProvenanceSource> = [
  'RUNTIME_OVERRIDE',
  'SECRET_REFERENCE',
  'ENVIRONMENT_VARIABLE',
  'GOVERNANCE_REGISTRY',
  'DEFAULT_FALLBACK'
];

export interface ParsedSecretReference {
  scheme: SecretScheme;
  identifier: string;
  raw: string;
}

export interface ResolvedConfigValue<T> {
  key: string;
  value: T;
  provenance: ConfigProvenanceSource;
  secretScheme?: SecretScheme;
  rawReference?: string;
  resolvedAt: number;
}

export interface CorsPolicyOptions {
  allowedOrigins: string[];
  allowCredentials?: boolean;
  environment?: RuntimeEnvironment;
}

export interface ValidatedCorsPolicy {
  allowedOrigins: ReadonlyArray<string>;
  allowCredentials: boolean;
  isOriginAllowed: (origin?: string | null) => boolean;
}

export interface TimeoutConfig {
  httpTimeoutMs: number;
  healthCheckTimeoutMs: number;
  pluginSandboxTimeoutMs: number;
}

export interface ValidatedRuntimeConfig {
  productId: string;
  environment: RuntimeEnvironment;
  region: string;
  timeouts: TimeoutConfig;
  cors: ValidatedCorsPolicy;
  serviceUrls: Record<string, string>;
  provenance: Record<string, ConfigProvenanceSource>;
}

export interface ConfigRegistryOptions {
  productRegistry?: ProductRegistry;
  env?: NodeJS.ProcessEnv;
  overrides?: Record<string, unknown>;
  secretStore?: Record<string, string>;
}

const REGION_PATTERN = /^[a-z]{2,10}(-[a-z0-9]{1,12}){0,3}$/i;
const MIN_TIMEOUT_MS = 100;
const MAX_TIMEOUT_MS = 300_000;

export class ConfigRegistry {
  private readonly productRegistry: ProductRegistry;
  private readonly env: NodeJS.ProcessEnv;
  private readonly overrides: Map<string, unknown> = new Map();
  private readonly secretVault: Map<string, string> = new Map();

  constructor(options?: ConfigRegistryOptions) {
    this.productRegistry = options?.productRegistry || ProductRegistry.getInstance();
    this.env = options?.env || process.env;

    if (options?.overrides) {
      for (const [k, v] of Object.entries(options.overrides)) {
        this.overrides.set(k, v);
      }
    }

    if (options?.secretStore) {
      for (const [k, v] of Object.entries(options.secretStore)) {
        this.secretVault.set(k, v);
      }
    }
  }

  public registerSecret(referenceOrKey: string, secretValue: string): void {
    this.secretVault.set(referenceOrKey, secretValue);
  }

  public setOverride(key: string, value: unknown): void {
    this.overrides.set(key, value);
  }

  public static isSecretReference(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    return SUPPORTED_SECRET_SCHEMES.some((scheme) => value.startsWith(scheme));
  }

  public static parseSecretReference(reference: string): ParsedSecretReference {
    if (!reference || typeof reference !== 'string') {
      throw new Error('Secret reference must be a non-empty string.');
    }

    const trimmed = reference.trim();
    const matchedScheme = SUPPORTED_SECRET_SCHEMES.find((scheme) => trimmed.startsWith(scheme));
    if (!matchedScheme) {
      throw new Error(
        `Invalid secret reference scheme in '${trimmed}'. Supported schemes: ${SUPPORTED_SECRET_SCHEMES.join(', ')}`
      );
    }

    const identifier = trimmed.slice(matchedScheme.length).trim();
    if (!identifier) {
      throw new Error(`Secret reference '${trimmed}' is missing a target secret identifier.`);
    }

    if (identifier.includes('..') || identifier.includes('\\') || /\s/.test(identifier)) {
      throw new Error(`Secret reference '${trimmed}' contains illegal path traversal or whitespace characters.`);
    }

    if (matchedScheme === 'env://' && !/^[A-Z_][A-Z0-9_]*$/i.test(identifier)) {
      throw new Error(`env:// secret reference '${trimmed}' must specify a valid environment variable name.`);
    }

    return {
      scheme: matchedScheme,
      identifier,
      raw: trimmed
    };
  }

  public resolveSecret(
    keyOrRef: string,
    options?: { allowPlaintextFallback?: boolean }
  ): ResolvedConfigValue<string> {
    if (this.overrides.has(keyOrRef)) {
      const overrideVal = String(this.overrides.get(keyOrRef));
      if (ConfigRegistry.isSecretReference(overrideVal)) {
        return this.resolveParsedSecretReference(
          keyOrRef,
          ConfigRegistry.parseSecretReference(overrideVal),
          'RUNTIME_OVERRIDE'
        );
      }
      return {
        key: keyOrRef,
        value: overrideVal,
        provenance: 'RUNTIME_OVERRIDE',
        resolvedAt: Date.now()
      };
    }

    const rawCandidate = ConfigRegistry.isSecretReference(keyOrRef)
      ? keyOrRef
      : this.env[keyOrRef];

    if (!rawCandidate) {
      throw new Error(`Required secret or reference '${keyOrRef}' could not be found.`);
    }

    if (ConfigRegistry.isSecretReference(rawCandidate)) {
      const parsed = ConfigRegistry.parseSecretReference(rawCandidate);
      return this.resolveParsedSecretReference(keyOrRef, parsed, 'SECRET_REFERENCE');
    }

    const currentEnv = this.validateEnvironment(this.env.NODE_ENV);
    const allowPlaintext =
      options?.allowPlaintextFallback ?? (currentEnv === 'development' || currentEnv === 'test');

    if (!allowPlaintext) {
      throw new Error(
        `Plaintext secret value rejected for '${keyOrRef}' in '${currentEnv}' environment; use a governed secret reference (${SUPPORTED_SECRET_SCHEMES.join(', ')}).`
      );
    }

    return {
      key: keyOrRef,
      value: rawCandidate,
      provenance: 'ENVIRONMENT_VARIABLE',
      resolvedAt: Date.now()
    };
  }

  private resolveParsedSecretReference(
    key: string,
    parsed: ParsedSecretReference,
    provenance: ConfigProvenanceSource
  ): ResolvedConfigValue<string> {
    if (this.secretVault.has(parsed.raw)) {
      return {
        key,
        value: this.secretVault.get(parsed.raw)!,
        provenance,
        secretScheme: parsed.scheme,
        rawReference: parsed.raw,
        resolvedAt: Date.now()
      };
    }

    if (this.secretVault.has(parsed.identifier)) {
      return {
        key,
        value: this.secretVault.get(parsed.identifier)!,
        provenance,
        secretScheme: parsed.scheme,
        rawReference: parsed.raw,
        resolvedAt: Date.now()
      };
    }

    if (parsed.scheme === 'env://') {
      const envVal = this.env[parsed.identifier];
      if (!envVal) {
        throw new Error(`Environment variable '${parsed.identifier}' referenced by '${parsed.raw}' is not set.`);
      }
      return {
        key,
        value: envVal,
        provenance,
        secretScheme: parsed.scheme,
        rawReference: parsed.raw,
        resolvedAt: Date.now()
      };
    }

    const normalizedId = parsed.identifier.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
    const schemeEnvPrefix =
      parsed.scheme === 'secretless-registry://'
        ? 'SECRETLESS_REGISTRY_'
        : parsed.scheme === 'aws-secrets://'
          ? 'AWS_SECRETS_'
          : 'KMS_';

    const mappedEnvValue = this.env[`${schemeEnvPrefix}${normalizedId}`] || this.env[normalizedId];
    if (mappedEnvValue) {
      return {
        key,
        value: mappedEnvValue,
        provenance,
        secretScheme: parsed.scheme,
        rawReference: parsed.raw,
        resolvedAt: Date.now()
      };
    }

    throw new Error(`Secret reference '${parsed.raw}' could not be resolved from registered secret authority.`);
  }

  public validateEnvironment(rawEnv?: string): RuntimeEnvironment {
    const candidate = (
      (this.overrides.get('NODE_ENV') as string) ||
      rawEnv ||
      this.env.NODE_ENV ||
      'development'
    )
      .trim()
      .toLowerCase();

    if (!(ALLOWED_ENVIRONMENTS as ReadonlyArray<string>).includes(candidate)) {
      throw new Error(
        `Invalid runtime environment '${candidate}'. Allowed environments: ${ALLOWED_ENVIRONMENTS.join(', ')}`
      );
    }

    return candidate as RuntimeEnvironment;
  }

  public validateRegion(rawRegion?: string): string {
    const candidate = (
      (this.overrides.get('UGONDU_REGION') as string) ||
      rawRegion ||
      this.env.UGONDU_REGION ||
      this.env.AWS_REGION ||
      'eu-west-1'
    ).trim();

    if (!REGION_PATTERN.test(candidate)) {
      throw new Error(`Invalid deployment region '${candidate}'.`);
    }

    return candidate;
  }

  public validateTimeout(timeoutMs: number, fieldName: string = 'timeoutMs'): number {
    if (typeof timeoutMs !== 'number' || !Number.isFinite(timeoutMs)) {
      throw new Error(`${fieldName} must be a finite number.`);
    }
    if (timeoutMs < MIN_TIMEOUT_MS || timeoutMs > MAX_TIMEOUT_MS) {
      throw new Error(
        `${fieldName} (${timeoutMs}ms) is outside governed bounds [${MIN_TIMEOUT_MS}ms, ${MAX_TIMEOUT_MS}ms].`
      );
    }
    return Math.floor(timeoutMs);
  }

  public validateServiceUrl(url: string, serviceName: string = 'service'): string {
    if (!url || typeof url !== 'string') {
      throw new Error(`Service URL for '${serviceName}' must be a non-empty string.`);
    }

    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      throw new Error(`Malformed service URL '${url}' for '${serviceName}'.`);
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`Unsupported protocol '${parsed.protocol}' in service URL '${url}' for '${serviceName}'.`);
    }

    if (parsed.username || parsed.password) {
      throw new Error(`Embedded credentials are prohibited in service URL for '${serviceName}'.`);
    }

    return url.trim().replace(/\/+$/, '');
  }

  public validateCorsPolicy(options: CorsPolicyOptions): ValidatedCorsPolicy {
    const allowCredentials = options.allowCredentials ?? true;
    const environment = options.environment || this.validateEnvironment();

    if (!Array.isArray(options.allowedOrigins) || options.allowedOrigins.length === 0) {
      throw new Error('CORS configuration requires at least one explicit allowed origin.');
    }

    const normalizedOrigins: string[] = [];
    for (const rawOrigin of options.allowedOrigins) {
      const trimmed = String(rawOrigin || '').trim();
      if (!trimmed) {
        throw new Error('Empty origin entry is not permitted in CORS allowedOrigins.');
      }

      if (trimmed === '*' || trimmed.includes('*')) {
        if (allowCredentials) {
          throw new Error('CORS policy violation: wildcard origin (*) is prohibited when credentials are enabled.');
        }
        if (environment === 'production' || environment === 'staging') {
          throw new Error(`CORS policy violation: wildcard origin (*) is prohibited in '${environment}' environment.`);
        }
        normalizedOrigins.push('*');
        continue;
      }

      let parsed: URL;
      try {
        parsed = new URL(trimmed);
      } catch {
        throw new Error(`Invalid CORS origin URL '${trimmed}'.`);
      }

      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error(`CORS origin '${trimmed}' must use http:// or https:// protocol.`);
      }

      if ((parsed.pathname && parsed.pathname !== '/') || parsed.search || parsed.hash) {
        throw new Error(`CORS origin '${trimmed}' must be an exact origin without path, query, or fragment.`);
      }

      if (environment === 'production' && parsed.protocol === 'http:') {
        throw new Error(`Insecure HTTP CORS origin '${trimmed}' is prohibited in production.`);
      }

      const canonicalOrigin = `${parsed.protocol}//${parsed.host}`;
      if (!normalizedOrigins.includes(canonicalOrigin)) {
        normalizedOrigins.push(canonicalOrigin);
      }
    }

    const originSet = new Set(normalizedOrigins);

    return {
      allowedOrigins: Object.freeze([...normalizedOrigins]),
      allowCredentials,
      isOriginAllowed: (requestOrigin?: string | null): boolean => {
        if (!requestOrigin) return false;
        const candidate = requestOrigin.trim();
        if (originSet.has('*') && !allowCredentials) {
          return true;
        }
        return originSet.has(candidate);
      }
    };
  }

  public loadRuntimeConfig(productId?: string): ValidatedRuntimeConfig {
    const provenance: Record<string, ConfigProvenanceSource> = {};
    const product = this.productRegistry.getProduct(productId);

    // Environment resolution with provenance
    const envRaw = this.overrides.has('NODE_ENV')
      ? String(this.overrides.get('NODE_ENV'))
      : this.env.NODE_ENV;
    provenance.environment = this.overrides.has('NODE_ENV')
      ? 'RUNTIME_OVERRIDE'
      : this.env.NODE_ENV
        ? 'ENVIRONMENT_VARIABLE'
        : 'DEFAULT_FALLBACK';
    const environment = this.validateEnvironment(envRaw);

    // Region resolution with provenance
    const regionRaw = this.overrides.has('UGONDU_REGION')
      ? String(this.overrides.get('UGONDU_REGION'))
      : this.env.UGONDU_REGION || this.env.AWS_REGION;
    provenance.region = this.overrides.has('UGONDU_REGION')
      ? 'RUNTIME_OVERRIDE'
      : this.env.UGONDU_REGION || this.env.AWS_REGION
        ? 'ENVIRONMENT_VARIABLE'
        : 'DEFAULT_FALLBACK';
    const region = this.validateRegion(regionRaw);

    // Timeouts resolution with provenance
    const resolveTimeoutField = (
      overrideKey: string,
      envKey: string,
      defaultMs: number
    ): number => {
      if (this.overrides.has(overrideKey)) {
        provenance[overrideKey] = 'RUNTIME_OVERRIDE';
        return this.validateTimeout(Number(this.overrides.get(overrideKey)), overrideKey);
      }
      if (this.env[envKey] !== undefined) {
        provenance[overrideKey] = 'ENVIRONMENT_VARIABLE';
        return this.validateTimeout(Number(this.env[envKey]), envKey);
      }
      provenance[overrideKey] = 'DEFAULT_FALLBACK';
      return this.validateTimeout(defaultMs, overrideKey);
    };

    const timeouts: TimeoutConfig = {
      httpTimeoutMs: resolveTimeoutField('httpTimeoutMs', 'UGONDU_HTTP_TIMEOUT_MS', 5000),
      healthCheckTimeoutMs: resolveTimeoutField('healthCheckTimeoutMs', 'UGONDU_HEALTH_TIMEOUT_MS', 3000),
      pluginSandboxTimeoutMs: resolveTimeoutField('pluginSandboxTimeoutMs', 'UGONDU_SANDBOX_TIMEOUT_MS', 10000)
    };

    // CORS resolution with provenance
    let rawOrigins: string[];
    if (this.overrides.has('allowedOrigins')) {
      rawOrigins = this.overrides.get('allowedOrigins') as string[];
      provenance.cors = 'RUNTIME_OVERRIDE';
    } else if (this.env.CORS_ALLOWED_ORIGINS) {
      rawOrigins = this.env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
      provenance.cors = 'ENVIRONMENT_VARIABLE';
    } else {
      rawOrigins = this.productRegistry.getAllowedOrigins(product.productId);
      if (environment === 'production') {
        rawOrigins = rawOrigins.filter((o) => o.startsWith('https://'));
      }
      provenance.cors = 'GOVERNANCE_REGISTRY';
    }

    const cors = this.validateCorsPolicy({
      allowedOrigins: rawOrigins,
      allowCredentials: product.cors.allowCredentials,
      environment
    });

    // Service URLs resolution & validation
    const serviceUrls: Record<string, string> = {};
    for (const svcKey of Object.keys(product.services)) {
      const envKey = `${svcKey.toUpperCase()}_URL`;
      let rawUrl: string;
      if (this.overrides.has(envKey)) {
        rawUrl = String(this.overrides.get(envKey));
        provenance[`serviceUrl.${svcKey}`] = 'RUNTIME_OVERRIDE';
      } else if (this.env[envKey]) {
        rawUrl = String(this.env[envKey]);
        provenance[`serviceUrl.${svcKey}`] = 'ENVIRONMENT_VARIABLE';
      } else {
        rawUrl = this.productRegistry.getServiceUrl(svcKey, undefined, { productId: product.productId });
        provenance[`serviceUrl.${svcKey}`] = 'GOVERNANCE_REGISTRY';
      }
      serviceUrls[svcKey] = this.validateServiceUrl(rawUrl, svcKey);
    }

    return {
      productId: product.productId,
      environment,
      region,
      timeouts,
      cors,
      serviceUrls,
      provenance
    };
  }

  private static instance?: ConfigRegistry;

  public static getInstance(): ConfigRegistry {
    if (!ConfigRegistry.instance) {
      ConfigRegistry.instance = new ConfigRegistry();
    }
    return ConfigRegistry.instance;
  }
}

export const globalConfigRegistry = ConfigRegistry.getInstance();
