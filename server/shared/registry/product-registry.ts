/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Server / Shared / Central Product & Service Registry
 * File           : product-registry.ts
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

import * as fs from 'fs';
import * as path from 'path';

export interface HealthContractConfig {
  liveness: string;
  readiness: string;
  metadata: string;
  legacyHealth?: string;
  metrics?: string;
}

export interface ServiceHealthConfig {
  liveness: string;
  readiness: string;
  metadata: string;
  legacy?: string;
}

export interface ServiceRegistryConfig {
  serviceId: string;
  name: string;
  displayName: string;
  port: number;
  host: string;
  dockerHost: string;
  protocol: 'http' | 'https';
  basePath: string;
  health: ServiceHealthConfig;
}

export interface EditionLimitsConfig {
  maxWorkspaces: number | null;
  maxEnvironments: number | null;
  maxTargets: number | null;
  maxDeploymentsPerMonth: number | null;
  maxFleetNodes: number | null;
  maxAiRequestsPerMonth: number | null;
}

export interface EditionCatalogEntry {
  id: string;
  code: string;
  legacyAlias?: string;
  rank: number;
  tokenPrefix: string;
  strategy: string;
  maxPlugins: number;
  rollbacks: boolean;
  atomic: boolean;
  telemetry: boolean;
  limits?: EditionLimitsConfig;
}

export interface ProductCapabilityDescriptor {
  capabilityId: string;
  displayName: string;
  capabilityClass: 'CORE' | 'EDITION' | 'METERED' | 'ADDON';
  minimumEdition: string;
  kind: string;
}

export interface ProductRecord {
  productId: string;
  id: string;
  slug: string;
  name: string;
  fullName: string;
  code: string;
  version: string;
  publisher: string;
  classification: string;
  tier: string;
  description: string;
  endpoints: Record<string, string>;
  healthContracts: HealthContractConfig;
  ports: Record<string, number>;
  services: Record<string, ServiceRegistryConfig>;
  editions: string[];
  editionCatalog: Record<string, EditionCatalogEntry>;
  capabilities: ProductCapabilityDescriptor[];
  cors: {
    allowedOrigins: string[];
    allowCredentials: boolean;
  };
  iam?: Record<string, unknown>;
  licensing?: Record<string, unknown>;
  billing?: Record<string, unknown>;
  telemetry?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ProductDefinitionYaml {
  productId?: string;
  code?: string;
  name?: string;
  version?: string;
  editions: string[];
  capabilities: string[];
  allowedOrigins: string[];
  ports: Record<string, number>;
  healthContracts: Partial<HealthContractConfig>;
}

function normalizeServiceKey(serviceName: string): string {
  return serviceName.trim().toLowerCase().replace(/-/g, '_');
}

function resolveWorkspaceRoot(customRoot?: string): string {
  if (customRoot && fs.existsSync(path.join(customRoot, '.governance'))) {
    return path.resolve(customRoot);
  }
  if (process.env.GOVERNANCE_ROOT) {
    const envRoot = path.resolve(process.env.GOVERNANCE_ROOT);
    if (fs.existsSync(path.join(envRoot, 'standards', 'product-registry.json'))) {
      return path.dirname(envRoot);
    }
    if (fs.existsSync(path.join(envRoot, '.governance', 'standards', 'product-registry.json'))) {
      return envRoot;
    }
  }

  const startDirs = ['/usr/src/app', process.cwd(), __dirname];
  for (const startDir of startDirs) {
    let current = path.resolve(startDir);
    for (let depth = 0; depth < 10; depth++) {
      const candidate = path.join(current, '.governance', 'standards', 'product-registry.json');
      if (fs.existsSync(candidate)) {
        return current;
      }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }

  throw new Error('Governance root containing .governance/standards/product-registry.json could not be discovered.');
}

/**
 * Deterministic lightweight parser for `.governance/product.definition.yaml`
 * to extract product identity, editions, capabilities, ports, health contracts, and CORS origins
 * without requiring external third-party YAML runtime dependencies.
 */
export function parseProductDefinitionYaml(rawYaml: string): ProductDefinitionYaml {
  const result: ProductDefinitionYaml = {
    editions: [],
    capabilities: [],
    allowedOrigins: [],
    ports: {},
    healthContracts: {}
  };

  const lines = rawYaml.split(/\r?\n/);
  let topSection = '';
  let subSection = '';

  for (const rawLine of lines) {
    const commentStripped = rawLine.replace(/#.*$/, '');
    if (!commentStripped.trim()) continue;

    const indent = commentStripped.search(/\S/);
    const trimmed = commentStripped.trim();

    if (indent === 0 && trimmed.endsWith(':')) {
      topSection = trimmed.slice(0, -1).trim();
      subSection = '';
      continue;
    }

    if (indent === 2 && trimmed.endsWith(':')) {
      subSection = trimmed.slice(0, -1).trim();
      continue;
    }

    if (topSection === 'product' && indent === 2 && trimmed.includes(':')) {
      const [k, ...rest] = trimmed.split(':');
      const val = rest.join(':').trim().replace(/^["']|["']$/g, '');
      const key = k.trim();
      if (key === 'id') result.productId = val;
      if (key === 'code') result.code = val;
      if (key === 'name') result.name = val;
      if (key === 'version') result.version = val;
    } else if (topSection === 'health_contracts' && indent === 2 && trimmed.includes(':')) {
      const [k, ...rest] = trimmed.split(':');
      const val = rest.join(':').trim().replace(/^["']|["']$/g, '');
      const key = k.trim();
      if (key === 'liveness') result.healthContracts.liveness = val;
      if (key === 'readiness') result.healthContracts.readiness = val;
      if (key === 'metadata') result.healthContracts.metadata = val;
      if (key === 'legacy_health') result.healthContracts.legacyHealth = val;
      if (key === 'metrics') result.healthContracts.metrics = val;
    } else if (topSection === 'services' && subSection && indent === 4 && trimmed.includes(':')) {
      const [k, ...rest] = trimmed.split(':');
      const val = rest.join(':').trim().replace(/^["']|["']$/g, '');
      if (k.trim() === 'port') {
        const parsedPort = Number(val);
        if (!Number.isNaN(parsedPort)) {
          result.ports[normalizeServiceKey(subSection)] = parsedPort;
        }
      }
    } else if (topSection === 'editions' && trimmed.startsWith('- ')) {
      result.editions.push(trimmed.slice(2).trim().replace(/^["']|["']$/g, ''));
    } else if (topSection === 'capabilities' && trimmed.startsWith('- ')) {
      result.capabilities.push(trimmed.slice(2).trim().replace(/^["']|["']$/g, ''));
    } else if (topSection === 'cors' && subSection === 'allowed_origins' && trimmed.startsWith('- ')) {
      result.allowedOrigins.push(trimmed.slice(2).trim().replace(/^["']|["']$/g, ''));
    }
  }

  return result;
}

export class ProductRegistry {
  private readonly workspaceRoot: string;
  private productsById: Map<string, ProductRecord> = new Map();
  private activeProductKey: string = '';
  private yamlDefinition?: ProductDefinitionYaml;

  constructor(customWorkspaceRoot?: string) {
    this.workspaceRoot = resolveWorkspaceRoot(customWorkspaceRoot);
    this.reload();
  }

  public reload(): void {
    this.productsById.clear();

    const registryPath = path.join(this.workspaceRoot, '.governance', 'standards', 'product-registry.json');
    const yamlPath = path.join(this.workspaceRoot, '.governance', 'product.definition.yaml');

    const rawRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    if (fs.existsSync(yamlPath)) {
      this.yamlDefinition = parseProductDefinitionYaml(fs.readFileSync(yamlPath, 'utf8'));
    }

    const rawProducts: any[] = Array.isArray(rawRegistry.products) ? rawRegistry.products : [];
    for (const item of rawProducts) {
      const normalized = this.normalizeProductEntry(item, rawRegistry, this.yamlDefinition);
      this.productsById.set(normalized.id.toLowerCase(), normalized);
      this.productsById.set(normalized.productId.toLowerCase(), normalized);
      this.productsById.set(normalized.code.toLowerCase(), normalized);
    }

    const workspaceBasename = path.basename(this.workspaceRoot).toLowerCase();
    const candidateActiveIds = [
      process.env.PRODUCT_ID,
      this.yamlDefinition?.productId,
      this.yamlDefinition?.code,
      rawRegistry.activeProductId,
      workspaceBasename
    ]
      .filter(Boolean)
      .map((id) => String(id).toLowerCase());

    let resolvedActive = '';
    for (const candidate of candidateActiveIds) {
      if (this.productsById.has(candidate)) {
        resolvedActive = candidate;
        break;
      }
    }

    if (!resolvedActive) {
      for (const product of this.discoverAllProducts()) {
        const repoPath = String(product.metadata?.repositoryPath || '').toLowerCase();
        if (repoPath && path.basename(repoPath) === workspaceBasename) {
          resolvedActive = product.id.toLowerCase();
          break;
        }
      }
    }

    if (!resolvedActive && rawProducts.length > 0) {
      resolvedActive = String(rawProducts[0].productId).toLowerCase();
    }

    this.activeProductKey = resolvedActive;
  }

  private normalizeProductEntry(
    raw: any,
    rootRegistry: any,
    yamlDef?: ProductDefinitionYaml
  ): ProductRecord {
    const rawId = String(raw.id || raw.slug || raw.productId || raw.code);
    const matchesYamlProduct =
      yamlDef?.productId &&
      (yamlDef.productId.toLowerCase() === rawId.toLowerCase() ||
        yamlDef.code?.toLowerCase() === String(raw.productId).toLowerCase());

    const healthContracts: HealthContractConfig = {
      liveness:
        raw.healthContracts?.liveness ||
        (matchesYamlProduct ? yamlDef?.healthContracts.liveness : undefined) ||
        raw.endpoints?.liveness ||
        raw.endpoints?.health ||
        '/health/live',
      readiness:
        raw.healthContracts?.readiness ||
        (matchesYamlProduct ? yamlDef?.healthContracts.readiness : undefined) ||
        raw.endpoints?.readiness ||
        '/health/ready',
      metadata:
        raw.healthContracts?.metadata ||
        (matchesYamlProduct ? yamlDef?.healthContracts.metadata : undefined) ||
        raw.endpoints?.metadata ||
        '/v1/metadata',
      legacyHealth:
        raw.healthContracts?.legacyHealth ||
        (matchesYamlProduct ? yamlDef?.healthContracts.legacyHealth : undefined) ||
        raw.endpoints?.legacyHealth ||
        '/health',
      metrics:
        raw.healthContracts?.metrics ||
        (matchesYamlProduct ? yamlDef?.healthContracts.metrics : undefined) ||
        raw.endpoints?.metrics ||
        '/metrics'
    };

    const ports: Record<string, number> = {};
    if (matchesYamlProduct && yamlDef?.ports) {
      for (const [k, v] of Object.entries(yamlDef.ports)) {
        ports[normalizeServiceKey(k)] = Number(v);
      }
    }
    if (raw.ports && typeof raw.ports === 'object') {
      for (const [k, v] of Object.entries(raw.ports)) {
        ports[normalizeServiceKey(k)] = Number(v);
      }
    }

    const services: Record<string, ServiceRegistryConfig> = {};
    if (raw.services && typeof raw.services === 'object') {
      for (const [svcKey, svcVal] of Object.entries<any>(raw.services)) {
        const canonicalKey = normalizeServiceKey(svcKey);
        const port = Number(svcVal.port ?? ports[canonicalKey]);
        ports[canonicalKey] = port;
        services[canonicalKey] = {
          serviceId: canonicalKey,
          name: String(svcVal.name || canonicalKey.replace(/_/g, '-')),
          displayName: String(svcVal.displayName || svcVal.name || canonicalKey),
          port,
          host: String(svcVal.host || 'localhost'),
          dockerHost: String(svcVal.dockerHost || canonicalKey.replace(/_/g, '-')),
          protocol: svcVal.protocol === 'https' ? 'https' : 'http',
          basePath: String(svcVal.basePath || '/v1'),
          health: {
            liveness: String(svcVal.health?.liveness || healthContracts.liveness),
            readiness: String(svcVal.health?.readiness || healthContracts.readiness),
            metadata: String(svcVal.health?.metadata || healthContracts.metadata),
            legacy: String(svcVal.health?.legacy || healthContracts.legacyHealth || '/health')
          }
        };
      }
    }

    const editions: string[] = Array.isArray(raw.editions)
      ? raw.editions.map((e: any) => String(e).toLowerCase())
      : matchesYamlProduct && yamlDef?.editions.length
        ? yamlDef.editions.map((e) => e.toLowerCase())
        : [];

    const editionCatalog: Record<string, EditionCatalogEntry> = {};
    if (raw.editionCatalog && typeof raw.editionCatalog === 'object') {
      for (const [edKey, edVal] of Object.entries<any>(raw.editionCatalog)) {
        editionCatalog[edKey.toLowerCase()] = {
          id: String(edVal.id || edKey).toLowerCase(),
          code: String(edVal.code || edKey).toUpperCase(),
          legacyAlias: edVal.legacyAlias ? String(edVal.legacyAlias) : undefined,
          rank: Number(edVal.rank || 1),
          tokenPrefix: String(edVal.tokenPrefix || '(none)'),
          strategy: String(edVal.strategy || 'atomic'),
          maxPlugins: Number(edVal.maxPlugins ?? 1),
          rollbacks: Boolean(edVal.rollbacks),
          atomic: Boolean(edVal.atomic),
          telemetry: Boolean(edVal.telemetry),
          limits: edVal.limits
        };
      }
    }

    const capabilities: ProductCapabilityDescriptor[] = Array.isArray(raw.capabilities)
      ? raw.capabilities.map((cap: any) =>
          typeof cap === 'string'
            ? {
                capabilityId: cap,
                displayName: cap,
                capabilityClass: 'CORE',
                minimumEdition: editions[0] || 'community',
                kind: 'Compute'
              }
            : {
                capabilityId: String(cap.capabilityId),
                displayName: String(cap.displayName || cap.capabilityId),
                capabilityClass: cap.capabilityClass || 'CORE',
                minimumEdition: String(cap.minimumEdition || editions[0] || 'community'),
                kind: String(cap.kind || 'Compute')
              }
        )
      : [];

    const allowedOrigins: string[] = Array.isArray(raw.cors?.allowedOrigins)
      ? raw.cors.allowedOrigins.map(String)
      : matchesYamlProduct && yamlDef?.allowedOrigins.length
        ? [...yamlDef.allowedOrigins]
        : raw.endpoints?.baseUrl
          ? [String(raw.endpoints.baseUrl)]
          : [];

    return {
      productId: String(raw.productId),
      id: rawId.toLowerCase(),
      slug: String(raw.slug || rawId).toLowerCase(),
      name: String(raw.name),
      fullName: String(raw.fullName || raw.name),
      code: String(raw.code || raw.productId).toUpperCase(),
      version: String(raw.version || (matchesYamlProduct ? yamlDef?.version : undefined) || rootRegistry.version || '1.0.0'),
      publisher: String(raw.publisher || rootRegistry.organization || 'AIR ROOFERS'),
      classification: String(raw.classification || 'COMMERCIAL_PRODUCT'),
      tier: String(raw.tier || 'ENTERPRISE'),
      description: String(raw.description || ''),
      endpoints: raw.endpoints || {},
      healthContracts,
      ports,
      services,
      editions,
      editionCatalog,
      capabilities,
      cors: {
        allowedOrigins,
        allowCredentials: raw.cors?.allowCredentials !== false
      },
      iam: raw.iam,
      licensing: raw.licensing,
      billing: raw.billing,
      telemetry: raw.telemetry,
      metadata: raw.metadata
    };
  }

  public getActiveProductId(): string {
    return this.activeProductKey;
  }

  public getProduct(productId?: string): ProductRecord {
    const lookupKey = (productId || this.activeProductKey).trim().toLowerCase();
    const record = this.productsById.get(lookupKey);
    if (!record) {
      throw new Error(`Product '${productId || this.activeProductKey}' not found in governance product registry.`);
    }
    return record;
  }

  public discoverAllProducts(): ProductRecord[] {
    const unique = new Map<string, ProductRecord>();
    for (const record of this.productsById.values()) {
      unique.set(record.productId.toUpperCase(), record);
    }
    return Array.from(unique.values());
  }

  public getServiceConfig(serviceName: string, productId?: string): ServiceRegistryConfig {
    const product = this.getProduct(productId);
    const key = normalizeServiceKey(serviceName);
    const svc = product.services[key];
    if (!svc) {
      throw new Error(
        `Service '${serviceName}' (normalized: '${key}') is not registered under product '${product.productId}'.`
      );
    }

    const envPortKey = `${key.toUpperCase()}_PORT`;
    const envHostKey = `${key.toUpperCase()}_HOST`;
    const resolvedPort = process.env[envPortKey] ? Number(process.env[envPortKey]) : svc.port;
    const resolvedHost =
      process.env[envHostKey] ||
      (process.env.CONTAINER_RUNTIME === 'docker' ? svc.dockerHost : svc.host);

    return {
      ...svc,
      port: Number.isNaN(resolvedPort) ? svc.port : resolvedPort,
      host: resolvedHost
    };
  }

  public getServiceUrl(
    serviceName: string,
    urlPath?: string,
    options?: { useDockerHost?: boolean; productId?: string }
  ): string {
    const svc = this.getServiceConfig(serviceName, options?.productId);
    const envUrlKey = `${svc.serviceId.toUpperCase()}_URL`;
    const envUrl = process.env[envUrlKey];

    let baseUrl: string;
    if (envUrl && !options?.useDockerHost) {
      try {
        const parsed = new URL(envUrl);
        baseUrl =
          urlPath && urlPath.startsWith('/')
            ? `${parsed.protocol}//${parsed.host}`
            : envUrl.replace(/\/+$/, '');
      } catch {
        baseUrl = envUrl.replace(/\/+$/, '');
      }
    } else {
      const host = options?.useDockerHost ? svc.dockerHost : svc.host;
      baseUrl = `${svc.protocol}://${host}:${svc.port}`;
    }

    if (!urlPath) {
      return baseUrl;
    }

    const normalizedPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
    return `${baseUrl.replace(/\/+$/, '')}${normalizedPath}`;
  }

  public getAllowedOrigins(productId?: string): string[] {
    const product = this.getProduct(productId);
    const origins = new Set<string>(product.cors.allowedOrigins);

    const extraEnvOrigins = [
      process.env.ALLOWED_ORIGINS,
      process.env.CORS_ALLOWED_ORIGINS,
      process.env.ENGINE_CORE_ORIGIN,
      process.env.ADMIN_ORIGIN
    ].filter(Boolean) as string[];

    for (const raw of extraEnvOrigins) {
      for (const part of raw.split(',')) {
        const trimmed = part.trim();
        if (trimmed && trimmed !== '*') {
          origins.add(trimmed);
        }
      }
    }

    return Array.from(origins);
  }

  public getEditions(productId?: string): string[] {
    return [...this.getProduct(productId).editions];
  }

  public getEditionCatalog(productId?: string): Record<string, EditionCatalogEntry> {
    return { ...this.getProduct(productId).editionCatalog };
  }

  public getCapabilities(productId?: string): ProductCapabilityDescriptor[] {
    return this.getProduct(productId).capabilities.map((cap) => ({ ...cap }));
  }

  public getCapabilityIds(productId?: string): string[] {
    return this.getProduct(productId).capabilities.map((cap) => cap.capabilityId);
  }

  public getHealthContracts(productId?: string): HealthContractConfig {
    return { ...this.getProduct(productId).healthContracts };
  }

  public getPorts(productId?: string): Record<string, number> {
    return { ...this.getProduct(productId).ports };
  }

  public getYamlDefinition(): ProductDefinitionYaml | undefined {
    return this.yamlDefinition;
  }

  // Static convenience façade delegating to singleton instance
  private static instance?: ProductRegistry;

  public static getInstance(): ProductRegistry {
    if (!ProductRegistry.instance) {
      ProductRegistry.instance = new ProductRegistry();
    }
    return ProductRegistry.instance;
  }

  public static getProduct(productId?: string): ProductRecord {
    return ProductRegistry.getInstance().getProduct(productId);
  }

  public static getServiceConfig(serviceName: string, productId?: string): ServiceRegistryConfig {
    return ProductRegistry.getInstance().getServiceConfig(serviceName, productId);
  }

  public static getServiceUrl(
    serviceName: string,
    urlPath?: string,
    options?: { useDockerHost?: boolean; productId?: string }
  ): string {
    return ProductRegistry.getInstance().getServiceUrl(serviceName, urlPath, options);
  }

  public static getAllowedOrigins(productId?: string): string[] {
    return ProductRegistry.getInstance().getAllowedOrigins(productId);
  }

  public static getEditions(productId?: string): string[] {
    return ProductRegistry.getInstance().getEditions(productId);
  }

  public static getCapabilities(productId?: string): ProductCapabilityDescriptor[] {
    return ProductRegistry.getInstance().getCapabilities(productId);
  }

  public static discoverAllProducts(): ProductRecord[] {
    return ProductRegistry.getInstance().discoverAllProducts();
  }
}

export const globalProductRegistry = ProductRegistry.getInstance();
