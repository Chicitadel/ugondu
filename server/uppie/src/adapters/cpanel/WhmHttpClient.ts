/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — WHM API 1 HTTPS Client
 * File           : WhmHttpClient.ts
 * Version        : 2.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Last Modified  : 2026-10-03
 * Classification : ENTERPRISE
 *
 * Governance:
 * - Corporate Governed
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
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

// @ts-ignore
import { __t } from '../../../../shared/i18n';
import type { AdapterContext } from '../IPolicyProviderAdapter';
import { WhmApiError } from './CpanelClient';
import type { WhmAccount, WhmClient, WhmFeatureList, WhmPackage } from './CpanelClient';

/** Credentials are `host`, `apiToken`, `username` (the WHM account that owns the token) and optionally `port` (2087 by default). */
const HOST = /^(?=.{1,253}$)[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/;
const WHM_USER = /^[A-Za-z0-9_.-]{1,32}$/;
const TOKEN = /^[A-Za-z0-9]{8,128}$/;
const DEFAULT_PORT = 2087;
const DEFAULT_TIMEOUT_MS = 30000;
/** The package settings WHM names differently when they are read (listpkgs) and when they are written (addpkg). */
const WRITE_NAME: Record<string, string> = { lang: 'language' };
const SKIPPED_ATTRIBUTES = new Set(['name', 'featurelist', 'pkg', 'pkgname']);

export interface WhmHttpOptions { fetchImpl?: typeof fetch; timeoutMs?: number }

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const asRecord = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {});
const text = (value: unknown): string => (value === undefined || value === null ? '' : String(value));
const flag = (value: unknown): boolean => value === true || value === 1 || value === '1' || value === 'y' || value === 'yes';
const nameOf = (item: unknown): string => (typeof item === 'string' ? item : text(asRecord(item).featurelist ?? asRecord(item).name ?? asRecord(item).id));

/** Names of the feature lists in a get_featurelists payload (plain names or objects that carry one). */
export function parseFeatureListNames(data: unknown): string[] {
  const d = asRecord(data);
  return asArray(d.featurelists ?? d.feature_lists ?? d.features).map(nameOf).filter((n) => n !== '');
}

/** Features of a get_featurelist_data payload; a feature the server disables is reported as off whatever the list says. */
export function parseFeatures(data: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  const raw = asRecord(data).features;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const f = asRecord(item);
      const id = text(f.id ?? f.feature);
      if (id !== '') out[id] = flag(f.value ?? f.enabled) && !flag(f.is_disabled);
    }
  } else {
    for (const [id, value] of Object.entries(asRecord(raw))) out[id] = flag(value);
  }
  return out;
}

/** Packages of a listpkgs payload with their settings keyed in lower case. */
export function parsePackages(data: unknown): WhmPackage[] {
  return asArray(asRecord(data).pkg).map((item) => {
    const row = asRecord(item);
    const attributes: Record<string, string> = {};
    let featureList = '';
    for (const [key, value] of Object.entries(row)) {
      const k = key.toLowerCase();
      if (k === 'featurelist') featureList = text(value);
      else if (!SKIPPED_ATTRIBUTES.has(k) && !k.startsWith('_')) attributes[k] = text(value);
    }
    return { name: text(row.name ?? row.NAME), featureList, attributes };
  }).filter((p) => p.name !== '');
}

/** Accounts of a listaccts payload. */
export function parseAccounts(data: unknown): WhmAccount[] {
  return asArray(asRecord(data).acct).map((item) => {
    const row = asRecord(item);
    return { user: text(row.user), plan: text(row.plan), domain: text(row.domain), owner: text(row.owner), suspended: flag(row.suspended) };
  }).filter((a) => a.user !== '');
}

/**
 * HTTPS client for WHM API 1 (https://host:2087/json-api/...). The API token travels only in the Authorization header,
 * certificates are always verified, the host must be a plain host name, and every call is bounded by a timeout.
 * The response shapes are read tolerantly (see the parse functions) because WHM versions differ in them.
 */
export function createHttpWhmClient(context: AdapterContext, options: WhmHttpOptions = {}): WhmClient {
  const { host = '', apiToken = '', username = '', port = String(DEFAULT_PORT) } = context.credentials;
  if (!HOST.test(host)) throw new Error(__t('uppie.adapter.cpanel.invalid_host'));
  const portNumber = Number(port);
  if (!WHM_USER.test(username) || !TOKEN.test(apiToken) || !Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) throw new Error(__t('uppie.adapter.cpanel.invalid_credentials'));
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function call(command: string, params: Record<string, string> = {}): Promise<unknown> {
    const query = new URLSearchParams({ ...params, 'api.version': '1' });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`https://${host}:${portNumber}/json-api/${command}?${query.toString()}`, {
        method: 'GET', headers: { Authorization: `whm ${username}:${apiToken}`, Accept: 'application/json' }, signal: controller.signal,
      });
      if (!response.ok) throw new WhmApiError(__t('uppie.adapter.cpanel.http_error', { command, status: response.status }), response.status);
      const body = asRecord(await response.json());
      const metadata = asRecord(body.metadata);
      if (metadata.result === undefined) throw new WhmApiError(__t('uppie.adapter.cpanel.invalid_response', { command }));
      if (Number(metadata.result) !== 1) throw new WhmApiError(__t('uppie.adapter.cpanel.api_error', { command, reason: text(metadata.reason) }));
      return body.data;
    } catch (e) {
      if (e instanceof WhmApiError) throw e;
      if (controller.signal.aborted) throw new WhmApiError(__t('uppie.adapter.cpanel.timeout', { command, seconds: Math.round(timeoutMs / 1000) }));
      throw new WhmApiError(__t('uppie.adapter.cpanel.network_error', { command, error: e instanceof Error ? e.message : String(e) }));
    } finally {
      clearTimeout(timer);
    }
  }

  const listFeatureLists = async (): Promise<string[]> => parseFeatureListNames(await call('get_featurelists'));
  const listPackages = async (): Promise<WhmPackage[]> => parsePackages(await call('listpkgs'));

  return {
    listFeatureLists,
    async getFeatureList(name): Promise<WhmFeatureList | undefined> {
      if (!(await listFeatureLists()).includes(name)) return undefined;
      return { name, features: parseFeatures(await call('get_featurelist_data', { featurelist: name })) };
    },
    async saveFeatureList(name, features, overwrite) {
      const params: Record<string, string> = {};
      for (const [id, enabled] of Object.entries(features)) params[id] = enabled ? '1' : '0';
      await call(overwrite ? 'update_featurelist' : 'create_featurelist', { ...params, featurelist: name });
    },
    async deleteFeatureList(name) { await call('delete_featurelist', { featurelist: name }); },
    listPackages,
    async createPackage(pkg) {
      const params: Record<string, string> = {};
      for (const [key, value] of Object.entries(pkg.attributes)) params[WRITE_NAME[key] ?? key] = value;
      await call('addpkg', { ...params, name: pkg.name, featurelist: pkg.featureList });
    },
    async deletePackage(name) { await call('killpkg', { pkgname: name }); },
    async listAccounts() { return parseAccounts(await call('listaccts')); },
    async getAccount(user) {
      return parseAccounts(await call('listaccts', { searchtype: 'user', search: user, searchmethod: 'exact' })).find((a) => a.user === user);
    },
    async changePackage(user, packageName) { await call('changepackage', { user, pkg: packageName }); },
    async listResellers() {
      const data = asRecord(await call('listresellers'));
      return asArray(data.reseller ?? data.resellers).map(nameOf).filter((n) => n !== '');
    },
  };
}
