/******************************************************************************
 * Project        : Ugondu - Universal Delivery Operating System
 * Module         : UPPIE - cPanel/WHM Test Support
 * File           : whmFake.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { WhmApiError } from '../../adapters/cpanel/CpanelClient';
import type { WhmAccount, WhmClient, WhmFeatureList, WhmPackage } from '../../adapters/cpanel/CpanelClient';

export const FEATURES = ['addondomains', 'backup', 'cron', 'fileman', 'ftpaccts', 'mysql', 'ssl', 'webmail'];
export const ctx: any = { tenantId: 't', environmentId: 'srv1', provider: 'CPANEL', credentials: {} };

export function rule(over: Record<string, any> = {}): any {
  return {
    ruleId: 'rule-1', version: '1.0.0', effect: 'ALLOW', conditions: [], scope: {}, purpose: 'test', owner: 'o',
    constraints: {}, validity: { issuedAt: '2026-01-01T00:00:00Z', expiresAt: 'PERMANENT', type: 'PERMANENT' },
    subject: { type: 'USER', id: 'alice' },
    action: { capability: 'Hosting.Files', operations: ['fileman', 'ftpaccts'] },
    resource: { type: 'cpanel::account', scope: 'alice.example.com' },
    ...over,
  };
}

const NAME = /^[A-Za-z0-9 _.-]{1,64}$/;
const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const refuse = (message: string): WhmApiError => new WhmApiError(message, 200);
const map = (enabled: string[]): Record<string, boolean> => Object.fromEntries(FEATURES.map((f) => [f, enabled.includes(f)]));

/**
 * In-memory WHM enforcing the server rules the adapter must respect: a list name must be unused to be created and must
 * exist to be updated, only features the server offers are accepted, a package needs an existing feature list, a package
 * in use by an account cannot be deleted, and an account can only move to an existing package.
 * Built-ins: lists default (all features), disabled (none) and "Mail Only"; packages default, Gold, Mailer.
 */
export function fakeWhm() {
  const lists = new Map<string, Record<string, boolean>>([['default', map(FEATURES)], ['disabled', map([])], ['Mail Only', map(['webmail'])]]);
  const packages = new Map<string, WhmPackage>();
  const accounts = new Map<string, WhmAccount>();
  const resellers = new Set<string>();
  const calls: string[] = [];
  const failures = new Set<string>();
  const seen = (op: string): void => {
    calls.push(op);
    const key = op.split(':')[0] as string;
    if (failures.delete(key)) throw new WhmApiError(`injected failure: ${key}`, 500);
  };

  const seed = {
    list: (name: string, enabled: string[]) => { lists.set(name, map(enabled)); },
    pkg: (name: string, featureList: string, attributes: Record<string, string> = {}) => { packages.set(name, { name, featureList, attributes }); },
    account: (user: string, plan: string, over: Partial<WhmAccount> = {}) => { accounts.set(user, { user, plan, domain: `${user}.example.com`, owner: 'root', suspended: false, ...over }); },
    reseller: (name: string) => { resellers.add(name); },
    failOnce: (op: string) => { failures.add(op); },
  };
  seed.pkg('default', 'default', { quota: '0', maxftp: 'unlimited', maxsql: 'unlimited', hasshell: 'n', lang: 'en' });
  seed.pkg('Gold', 'default', { quota: '5000', maxftp: '10', maxsql: '5', hasshell: 'y', lang: 'fr' });
  seed.pkg('Mailer', 'Mail Only', { quota: '500', maxftp: '0', maxsql: '0', hasshell: 'n', lang: 'en' });
  seed.account('alice', 'Gold');
  seed.account('bob', 'Mailer');
  seed.account('carol', 'default');
  seed.account('dave', 'Gold', { suspended: true });
  seed.account('erin', 'Ghost');

  const client: WhmClient = {
    async listFeatureLists() { seen('listFeatureLists'); return [...lists.keys()]; },
    async getFeatureList(name): Promise<WhmFeatureList | undefined> {
      seen(`getFeatureList:${name}`);
      const features = lists.get(name);
      return features ? { name, features: copy(features) } : undefined;
    },
    async saveFeatureList(name, features, overwrite) {
      seen(`saveFeatureList:${name}:${overwrite ? 'overwrite' : 'create'}`);
      if (!NAME.test(name)) throw refuse(`invalid feature list name ${name}`);
      for (const id of Object.keys(features)) if (!FEATURES.includes(id)) throw refuse(`unknown feature ${id}`);
      if (overwrite && !lists.has(name)) throw refuse(`feature list ${name} does not exist`);
      if (!overwrite && lists.has(name)) throw refuse(`feature list ${name} already exists`);
      lists.set(name, { ...map([]), ...copy(features) });
    },
    async deleteFeatureList(name) {
      seen(`deleteFeatureList:${name}`);
      if (name === 'default' || name === 'disabled') throw refuse(`feature list ${name} is built in`);
      if (!lists.delete(name)) throw refuse(`feature list ${name} does not exist`);
    },
    async listPackages() { seen('listPackages'); return copy([...packages.values()]); },
    async createPackage(pkg) {
      seen(`createPackage:${pkg.name}`);
      if (!NAME.test(pkg.name)) throw refuse(`invalid package name ${pkg.name}`);
      if (packages.has(pkg.name)) throw refuse(`package ${pkg.name} already exists`);
      if (!lists.has(pkg.featureList)) throw refuse(`feature list ${pkg.featureList} does not exist`);
      packages.set(pkg.name, copy(pkg));
    },
    async deletePackage(name) {
      seen(`deletePackage:${name}`);
      if (!packages.has(name)) throw refuse(`package ${name} does not exist`);
      if ([...accounts.values()].some((a) => a.plan === name)) throw refuse(`package ${name} is in use`);
      packages.delete(name);
    },
    async listAccounts() { seen('listAccounts'); return copy([...accounts.values()]); },
    async getAccount(user) { seen(`getAccount:${user}`); const a = accounts.get(user); return a ? copy(a) : undefined; },
    async changePackage(user, packageName) {
      seen(`changePackage:${user}:${packageName}`);
      const account = accounts.get(user);
      if (!account) throw refuse(`account ${user} does not exist`);
      if (!packages.has(packageName)) throw refuse(`package ${packageName} does not exist`);
      account.plan = packageName;
    },
    async listResellers() { seen('listResellers'); return [...resellers]; },
  };

  const state = {
    plan: (user: string): string | undefined => accounts.get(user)?.plan,
    list: (name: string): string[] | undefined => { const l = lists.get(name); return l ? FEATURES.filter((f) => l[f]) : undefined; },
    pkg: (name: string): WhmPackage | undefined => packages.get(name),
    packageNames: (): string[] => [...packages.keys()].sort(),
    listNames: (): string[] => [...lists.keys()].sort(),
  };
  return { client, calls, seed, state };
}
