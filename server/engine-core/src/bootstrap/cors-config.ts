/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : Engine Core — CORS Configuration
 * File           : cors-config.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers SASU / Ujomor Engineering
 * Created Date   : 2026-10-02
 * Last Modified  : 2026-10-18
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
 * - Deployment Authority   : Air Roofers Release Engineering
 *
 * Copyright (c) 2026 Air Roofers SASU. All Rights Reserved.
 ******************************************************************************/

import cors, { CorsOptions } from 'cors';
import * as fs from 'fs';
import * as path from 'path';
import { __t } from '@ugondu/shared';

export interface CorsPolicyConfigOptions {
  env?: NodeJS.ProcessEnv;
  allowedOrigins?: ReadonlyArray<string>;
  credentials?: boolean;
  productId?: string;
}

function discoverProductRegistryPath(): string | null {
  const startDirs = [process.cwd(), __dirname];
  for (const startDir of startDirs) {
    let current = path.resolve(startDir);
    for (let depth = 0; depth < 10; depth++) {
      const candidate = path.join(current, '.governance', 'standards', 'product-registry.json');
      if (fs.existsSync(candidate)) {
        return candidate;
      }
      const parent = path.dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }
  return null;
}

function loadRegistryAllowedOrigins(productId: string = 'UGONDU'): string[] {
  const registryPath = discoverProductRegistryPath();
  if (!registryPath) {
    return [];
  }

  try {
    const raw = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const products: any[] = Array.isArray(raw.products) ? raw.products : [];
    const targetCode = productId.trim().toUpperCase();
    const matched = products.find(
      (p) =>
        String(p.productId || '').toUpperCase() === targetCode ||
        String(p.code || '').toUpperCase() === targetCode ||
        String(p.id || '').toUpperCase() === targetCode
    );

    const origins = new Set<string>();
    const extractFromProduct = (prod: any): void => {
      if (!prod) return;
      if (Array.isArray(prod.cors?.allowedOrigins)) {
        for (const orig of prod.cors.allowedOrigins) {
          if (typeof orig === 'string' && orig.trim()) {
            origins.add(orig.trim());
          }
        }
      }
      if (typeof prod.endpoints?.baseUrl === 'string' && prod.endpoints.baseUrl.trim()) {
        origins.add(prod.endpoints.baseUrl.trim());
      }
      if (typeof prod.licensing?.licenseServer === 'string' && prod.licensing.licenseServer.trim()) {
        origins.add(prod.licensing.licenseServer.trim());
      }
      if (typeof prod.billing?.billingServer === 'string' && prod.billing.billingServer.trim()) {
        origins.add(prod.billing.billingServer.trim());
      }
    };

    if (matched) {
      extractFromProduct(matched);
    } else {
      for (const prod of products) {
        extractFromProduct(prod);
      }
    }

    return Array.from(origins);
  } catch {
    return [];
  }
}

export function normalizeAndValidateOrigin(rawOrigin: string, credentials: boolean = true): string {
  const trimmed = String(rawOrigin || '').trim();
  if (!trimmed) {
    throw new Error(__t('cors_policy_violation'));
  }

  if (trimmed === '*' || trimmed.includes('*')) {
    if (credentials) {
      throw new Error(__t('cors_policy_violation'));
    }
    return '*';
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(__t('cors_policy_violation'));
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(__t('cors_policy_violation'));
  }

  if ((parsed.pathname && parsed.pathname !== '/') || parsed.search || parsed.hash || parsed.username || parsed.password) {
    throw new Error(__t('cors_policy_violation'));
  }

  return `${parsed.protocol}//${parsed.host}`;
}

export function resolveAllowedOrigins(options?: CorsPolicyConfigOptions): ReadonlyArray<string> {
  const env = options?.env ?? process.env;
  const credentials = options?.credentials ?? true;
  const productId = options?.productId ?? env['PRODUCT_ID'] ?? 'UGONDU';

  let candidates: string[] = [];

  if (options?.allowedOrigins && options.allowedOrigins.length > 0) {
    candidates = [...options.allowedOrigins];
  } else {
    const envRaw = env['ALLOWED_ORIGINS'] ?? env['CORS_ALLOWED_ORIGINS'];
    if (typeof envRaw === 'string' && envRaw.trim().length > 0) {
      candidates = envRaw
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    } else {
      candidates = loadRegistryAllowedOrigins(productId);
    }
  }

  const normalized: string[] = [];
  for (const candidate of candidates) {
    const canonical = normalizeAndValidateOrigin(candidate, credentials);
    if (!normalized.includes(canonical)) {
      normalized.push(canonical);
    }
  }

  return Object.freeze(normalized);
}

export function isOriginAllowed(
  requestOrigin: string | undefined,
  options?: CorsPolicyConfigOptions
): boolean {
  if (!requestOrigin) {
    return true;
  }

  const credentials = options?.credentials ?? true;
  const candidate = requestOrigin.trim();
  if (!candidate || candidate === '*' || candidate.includes('*')) {
    return false;
  }

  const allowedOrigins = resolveAllowedOrigins({ ...options, credentials });
  return allowedOrigins.includes(candidate);
}

export function createCorsOptions(options?: CorsPolicyConfigOptions): CorsOptions {
  const credentials = options?.credentials ?? true;

  return {
    credentials,
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      try {
        const permitted = isOriginAllowed(origin, { ...options, credentials });
        if (!permitted) {
          return callback(new Error(__t('cors_policy_violation')), false);
        }
        return callback(null, true);
      } catch {
        return callback(new Error(__t('cors_policy_violation')), false);
      }
    },
  };
}

export function createCorsMiddleware(options?: CorsPolicyConfigOptions) {
  return cors(createCorsOptions(options));
}

export const corsMiddleware = createCorsMiddleware();
