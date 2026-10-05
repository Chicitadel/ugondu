/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : UPPIE - WHM HTTPS Client Tests
 * File           : whm-http-client.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { WhmApiError } from '../adapters/cpanel/CpanelClient';
import { createHttpWhmClient, parseAccounts, parseFeatureListNames, parseFeatures, parsePackages } from '../adapters/cpanel/WhmHttpClient';
// @ts-ignore
import { __t } from '../../../shared/i18n';

declare var describe: any, it: any, expect: any;

const T = (key: string, params?: Record<string, string | number>): string => __t(`uppie.adapter.cpanel.${key}`, params);
const TOKEN = 'ABCDEFGH12345678';
const credentials = { host: 'whm.example.com', username: 'root', apiToken: TOKEN };
const ok = (data: unknown) => ({ metadata: { result: 1, reason: 'OK' }, data });
const failure = async (run: () => Promise<any>): Promise<any> => { try { await run(); return undefined; } catch (e: any) { return e; } };
const refused = (build: () => unknown): string => { try { build(); return ''; } catch (e: any) { return e.message; } };

type Reply = unknown | ((url: string, init: any) => unknown);
function http(replies: Record<string, Reply>, extra: Record<string, string> = {}, options: { timeoutMs?: number } = {}) {
  const requests: Array<{ url: string; init: any }> = [];
  const fetchImpl: any = async (url: string, init: any) => {
    requests.push({ url, init });
    const reply = replies[new URL(url).pathname.split('/').pop() as string];
    const body = typeof reply === 'function' ? await (reply as any)(url, init) : reply;
    return { ok: true, status: 200, json: async () => body };
  };
  const client = createHttpWhmClient({ tenantId: 't', environmentId: 'e', provider: 'CPANEL', credentials: { ...credentials, ...extra } }, { fetchImpl, ...options });
  const query = (n = 0): URLSearchParams => new URL(requests[n]?.url as string).searchParams;
  return { client, requests, query };
}

describe(__t('whm_request_construction'), () => {
  it(__t('calls_json_api_over_https_with'), async () => {
    const { client, requests, query } = http({ get_featurelists: ok({ featurelists: ['default', __t('mail_only')] }) });
    expect(await client.listFeatureLists()).toEqual(['default', __t('mail_only')]);
    const request = requests[0] as { url: string; init: any };
    expect(request.url.startsWith('https://whm.example.com:2087/json-api/get_featurelists?')).toBe(true);
    expect(query().get('api.version')).toBe('1');
    expect(request.init.method).toBe('GET');
    expect(request.init.headers.Authorization).toBe(`whm root:${TOKEN}`);
    expect(request.url.includes(TOKEN)).toBe(false);
  });

  it(__t('honours_a_configured_port'), async () => {
    const { client, requests } = http({ listresellers: ok({ reseller: ['bob', 'carol'] }) }, { port: '2086' });
    expect(await client.listResellers()).toEqual(['bob', 'carol']);
    expect(requests[0]?.url.startsWith('https://whm.example.com:2086/json-api/listresellers?')).toBe(true);
  });

  it(__t('writes_complete_feature_maps_w'), async () => {
    const { client, requests, query } = http({ create_featurelist: ok({}), update_featurelist: ok({}) });
    const command = (n: number): string => new URL(requests[n]?.url as string).pathname.split('/').pop() as string;
    await client.saveFeatureList('ugondu_x', { fileman: true, mysql: false, featurelist: true, 'api.version': false }, false);
    await client.saveFeatureList('ugondu_x', { fileman: true }, true);
    expect(command(0)).toBe('create_featurelist');
    expect(command(1)).toBe('update_featurelist');
    expect(query(0).get('featurelist')).toBe('ugondu_x');
    expect(query(0).get('api.version')).toBe('1');
    expect(query(0).get('fileman')).toBe('1');
    expect(query(0).get('mysql')).toBe('0');
    expect(query(1).get('featurelist')).toBe('ugondu_x');
  });

  it(__t('reads_a_list_only_when_it_exis'), async () => {
    const { client, requests, query } = http({
      get_featurelists: ok({ featurelists: ['default'] }),
      get_featurelist_data: ok({ features: [{ id: 'fileman', value: '1', is_disabled: 0 }, { id: 'mysql', value: 1, is_disabled: 1 }, { id: 'cron', value: 0, is_disabled: 0 }] }),
    });
    expect(await client.getFeatureList('missing')).toBeUndefined();
    expect(requests.length).toBe(1);
    expect(await client.getFeatureList('default')).toEqual({ name: 'default', features: { fileman: true, mysql: false, cron: false } });
    expect(query(2).get('featurelist')).toBe('default');
  });

  it(__t('creates_packages_with_write_si'), async () => {
    const { client, query } = http({ addpkg: ok({}), killpkg: ok({}), changepackage: ok({}), delete_featurelist: ok({}) });
    await client.createPackage({ name: 'ugondu_x__Gold', featureList: 'ugondu_x', attributes: { quota: '5000', lang: 'fr', name: 'evil', featurelist: 'evil' } });
    expect(query(0).get('name')).toBe('ugondu_x__Gold');
    expect(query(0).get('featurelist')).toBe('ugondu_x');
    expect(query(0).get('quota')).toBe('5000');
    expect(query(0).get('language')).toBe('fr');
    expect(query(0).has('lang')).toBe(false);
    await client.deletePackage('ugondu_x__Gold');
    await client.changePackage('alice', 'Gold');
    await client.deleteFeatureList('ugondu_x');
    expect(query(1).get('pkgname')).toBe('ugondu_x__Gold');
    expect([query(2).get('user'), query(2).get('pkg')]).toEqual(['alice', 'Gold']);
    expect(query(3).get('featurelist')).toBe('ugondu_x');
  });

  it(__t('looks_accounts_up_by_exact_use'), async () => {
    const acct = [{ user: 'alice', plan: 'Gold', domain: 'alice.example.com', owner: 'root', suspended: 0 }, { user: 'alicia', plan: 'default', domain: 'x.example.com', owner: 'root', suspended: 1 }];
    const { client, query } = http({ listaccts: ok({ acct }) });
    expect(await client.getAccount('alice')).toEqual({ user: 'alice', plan: 'Gold', domain: 'alice.example.com', owner: 'root', suspended: false });
    expect(query().get('searchtype')).toBe('user');
    expect(query().get('search')).toBe('alice');
    expect(query().get('searchmethod')).toBe('exact');
    expect(await client.getAccount('bob')).toBeUndefined();
    expect((await client.listAccounts()).map((a) => a.suspended)).toEqual([false, true]);
  });
});

describe(__t('whm_response_parsing'), () => {
  it(__t('reads_list_names_features_pack'), () => {
    expect(parseFeatureListNames({ featurelists: [{ featurelist: 'a' }, { name: 'b' }, 'c', {}] })).toEqual(['a', 'b', 'c']);
    expect(parseFeatureListNames({ features: ['x'] })).toEqual(['x']);
    expect(parseFeatureListNames(undefined)).toEqual([]);
    expect(parseFeatures({ features: { fileman: '1', cron: '0', mysql: true } })).toEqual({ fileman: true, cron: false, mysql: true });
    expect(parseFeatures({ features: [{ feature: 'ssl', enabled: 'y' }, { value: 1 }] })).toEqual({ ssl: true });
    expect(parseFeatures(null)).toEqual({});
    expect(parsePackages({ pkg: [{ name: 'Gold', FEATURELIST: 'default', QUOTA: '5000', LANG: 'fr', MAXFTP: 10, _PACKAGE_EXTENSIONS: '' }, { QUOTA: '1' }] }))
      .toEqual([{ name: 'Gold', featureList: 'default', attributes: { quota: '5000', lang: 'fr', maxftp: '10' } }]);
    expect(parseAccounts({ acct: [{ user: 'a', plan: 'p', domain: 'd', owner: 'o', suspended: '1' }, { plan: 'none' }] }))
      .toEqual([{ user: 'a', plan: 'p', domain: 'd', owner: 'o', suspended: true }]);
  });
});

describe(__t('whm_failures'), () => {
  it(__t('reports_a_refused_call_with_th'), async () => {
    const refusal = http({ get_featurelists: { metadata: { result: 0, reason: __t('access_denied') } } });
    expect((await failure(() => refusal.client.listFeatureLists())).message).toBe(T('api_error', { command: 'get_featurelists', reason: __t('access_denied') }));
    const status: any = async () => ({ ok: false, status: 503, json: async () => ({}) });
    const down = createHttpWhmClient({ tenantId: 't', environmentId: 'e', provider: 'CPANEL', credentials }, { fetchImpl: status });
    const error = await failure(() => down.listPackages());
    expect(error instanceof WhmApiError).toBe(true);
    expect(error.status).toBe(503);
    expect(error.message).toBe(T('http_error', { command: 'listpkgs', status: 503 }));
    const bare = http({ listpkgs: { data: {} } });
    expect((await failure(() => bare.client.listPackages())).message).toBe(T('invalid_response', { command: 'listpkgs' }));
  });

  it(__t('reports_network_failures_and_u'), async () => {
    const unreachable: any = async () => { throw new Error(__t('connect_econnrefused')); };
    const a = createHttpWhmClient({ tenantId: 't', environmentId: 'e', provider: 'CPANEL', credentials }, { fetchImpl: unreachable });
    const down = await failure(() => a.listAccounts());
    expect(down.message).toBe(T('network_error', { command: 'listaccts', error: __t('connect_econnrefused') }));
    expect(down.message.includes(TOKEN)).toBe(false);
    const garbled: any = async () => ({ ok: true, status: 200, json: async () => { throw new Error(__t('unexpected_token')); } });
    const b = createHttpWhmClient({ tenantId: 't', environmentId: 'e', provider: 'CPANEL', credentials }, { fetchImpl: garbled });
    expect((await failure(() => b.listAccounts())).message).toBe(T('network_error', { command: 'listaccts', error: __t('unexpected_token') }));
    const silent: any = (_url: string, init: any) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
    const c = createHttpWhmClient({ tenantId: 't', environmentId: 'e', provider: 'CPANEL', credentials }, { fetchImpl: silent, timeoutMs: 30 });
    expect((await failure(() => c.listPackages())).message).toBe(T('timeout', { command: 'listpkgs', seconds: 0 }));
  });

  it(__t('refuses_hosts_that_are_not_pla'), () => {
    const build = (over: Record<string, string>) => () => createHttpWhmClient({ tenantId: 't', environmentId: 'e', provider: 'CPANEL', credentials: { ...credentials, ...over } });
    for (const host of ['', 'evil.com/path', 'a b', 'http://x', 'host:80', 'x@y.com', '-bad.example.com']) expect(refused(build({ host }))).toBe(T('invalid_host'));
    const malformed: Array<Record<string, string>> = [{ username: '' }, { username: 'a b' }, { apiToken: 'short' }, { apiToken: __t('abcdefgh_2345678') }, { apiToken: '' }, { port: '0' }, { port: '70000' }, { port: 'abc' }, { port: '20.5' }];
    for (const over of malformed) {
      expect(refused(build(over))).toBe(T('invalid_credentials'));
    }
    expect(refused(build({}))).toBe('');
    expect(refused(build({ host: '192.0.2.10', port: '2087' }))).toBe('');
  });
});
