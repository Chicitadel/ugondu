/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — cPanel Adapter Helpers
 * File           : CpanelHelpers.ts
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

import { createHash } from 'crypto';
// @ts-ignore
import { __t } from '../../../../shared/i18n';
import type { AuthorizationRule } from '../../types/index';
import type { WhmAccount, WhmClient, WhmPackage } from './CpanelClient';

/** Feature lists and packages created by Ugondu carry this prefix; nothing else is ever changed or removed. */
export const LIST_PREFIX = 'ugondu_';
/** A package that carries a managed list is named `<list>__<original package>`, so detaching can restore the original. */
export const PACKAGE_SEPARATOR = '__';
/** Conservative bound on a package name; longer origin packages are refused rather than risk a rejected name. */
export const MAX_PACKAGE_NAME = 64;
/** Every feature the server offers is enabled or disabled in this built-in list, which therefore serves as the catalog. */
export const CATALOG_LIST = 'default';

const MANAGED_LIST = /^ugondu_[A-Za-z0-9.-]{1,48}$/;
const NAME_SUFFIX = /^[A-Za-z0-9.-]{1,48}$/;
const FEATURE_ID = /^[a-z0-9][a-z0-9_.-]{0,63}$/;
const ACCOUNT_USER = /^[a-z][a-z0-9_-]{0,31}$/;
const MANAGED_PLAN = /^(ugondu_[A-Za-z0-9.-]{1,48})__(.+)$/;

/** Native form of a policy: the managed feature list name and the features it enables. */
export interface CpanelDocument { name: string; features: string[] }

export const fail = (key: string, params?: Record<string, string | number>): Error => new Error(__t(key, params));
export const errorText = (e: unknown): string => (e instanceof Error ? e.message : String(e));
export const isManagedList = (name: string): boolean => MANAGED_LIST.test(name);

export function assertManaged(name: string): void {
  if (!isManagedList(name)) throw fail('uppie.adapter.cpanel.unmanaged_list', { name });
}

export function parseUser(target: string): string {
  const user = (target ?? '').trim();
  if (!ACCOUNT_USER.test(user)) throw fail('uppie.adapter.cpanel.invalid_account', { account: user });
  return user;
}

/** The managed list name for a clone: the `ugondu_` prefix is added when missing. */
export function cloneListName(requested: string): string {
  const raw = (requested ?? '').trim();
  const suffix = raw.startsWith(LIST_PREFIX) ? raw.slice(LIST_PREFIX.length) : raw;
  if (!NAME_SUFFIX.test(suffix)) throw fail('uppie.adapter.cpanel.invalid_name', { name: raw });
  return `${LIST_PREFIX}${suffix}`;
}

/**
 * cPanel has no Deny, no conditions and no expiry: a feature list is an account-wide, permanent switch per feature.
 * Anything else is refused instead of being widened into an unconditional permanent grant.
 */
export function assertAllowable(rule: AuthorizationRule): void {
  if (rule.effect !== 'ALLOW') throw fail('uppie.adapter.cpanel.deny_unsupported', { ruleId: rule.ruleId });
  const c = rule.constraints ?? {};
  if (rule.conditions.length > 0 || c.maxCallsPerHour !== undefined || !!c.ipRange || !!c.requireMfa) throw fail('uppie.adapter.cpanel.condition_unsupported', { ruleId: rule.ruleId });
  if (rule.validity.expiresAt !== 'PERMANENT') throw fail('uppie.adapter.cpanel.validity_unsupported', { ruleId: rule.ruleId });
  if (rule.action.operations.length === 0) throw fail('uppie.adapter.cpanel.invalid_rule', { ruleId: rule.ruleId });
}

/** The sorted, de-duplicated features granted by the rules (each operation is a WHM feature id). */
export function compileFeatures(rules: AuthorizationRule[]): string[] {
  if (rules.length === 0) throw fail('uppie.adapter.cpanel.no_rules');
  const features = new Set<string>();
  for (const rule of rules) {
    assertAllowable(rule);
    rule.action.operations.forEach((op) => features.add(op.trim()));
  }
  return [...features].sort();
}

export function assertKnownFeatures(features: string[], catalog: string[]): void {
  for (const feature of features) {
    if (!FEATURE_ID.test(feature) || !catalog.includes(feature)) throw fail('uppie.adapter.cpanel.unknown_feature', { feature });
  }
}

export const digestOfFeatures = (features: string[]): string => createHash('sha256').update(JSON.stringify({ features: [...features].sort() })).digest('hex');
export const digestOfDocument = (document: CpanelDocument): string => digestOfFeatures(document.features);

export function buildDocument(rules: AuthorizationRule[], catalog: string[]): CpanelDocument {
  const features = compileFeatures(rules);
  assertKnownFeatures(features, catalog);
  return { name: `${LIST_PREFIX}${digestOfFeatures(features).slice(0, 12)}`, features };
}

export function validateDocument(document: CpanelDocument | undefined, catalog: string[]): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!document || typeof document.name !== 'string' || !Array.isArray(document.features)) return { errors: [__t('uppie.adapter.cpanel.validate.invalid_document')], warnings };
  if (!isManagedList(document.name)) errors.push(__t('uppie.adapter.cpanel.validate.invalid_name', { name: document.name }));
  if (document.features.length === 0) errors.push(__t('uppie.adapter.cpanel.validate.no_features'));
  for (const feature of document.features) {
    if (typeof feature !== 'string' || !FEATURE_ID.test(feature) || !catalog.includes(feature)) errors.push(__t('uppie.adapter.cpanel.validate.unknown_feature', { feature: String(feature) }));
  }
  if (errors.length === 0 && catalog.every((f) => document.features.includes(f))) warnings.push(__t('uppie.adapter.cpanel.validate.all_features'));
  return { errors, warnings };
}

export const enabledOf = (features: Record<string, boolean>): string[] => Object.keys(features).filter((id) => features[id]).sort();
export const featureMap = (catalog: string[], enabled: string[]): Record<string, boolean> => Object.fromEntries(catalog.map((id) => [id, enabled.includes(id)]));
export const sameSet = (a: string[], b: string[]): boolean => a.length === b.length && a.every((x) => b.includes(x));

/** The original package and managed list behind a plan name created by attach; undefined for any other plan. */
export function managedPlan(plan: string): { list: string; origin: string } | undefined {
  const match = MANAGED_PLAN.exec(plan);
  return match ? { list: match[1] as string, origin: match[2] as string } : undefined;
}
export const packageNameFor = (list: string, origin: string): string => `${list}${PACKAGE_SEPARATOR}${origin}`;

export async function catalogOf(client: WhmClient): Promise<string[]> {
  const base = await client.getFeatureList(CATALOG_LIST);
  if (!base) throw fail('uppie.adapter.cpanel.catalog_unavailable', { name: CATALOG_LIST });
  return Object.keys(base.features).sort();
}

export async function accountOf(client: WhmClient, user: string): Promise<WhmAccount> {
  const account = await client.getAccount(user);
  if (!account) throw fail('uppie.adapter.cpanel.account_not_found', { account: user });
  return account;
}

/** Packages that carry the list, and the accounts that use one of them. */
export async function usersOfList(client: WhmClient, list: string): Promise<{ packages: WhmPackage[]; accounts: WhmAccount[] }> {
  const packages = (await client.listPackages()).filter((p) => p.featureList === list);
  const names = new Set(packages.map((p) => p.name));
  return { packages, accounts: (await client.listAccounts()).filter((a) => names.has(a.plan)) };
}

/** Removes the packages Ugondu created for a list once no account uses them (idempotent). */
export async function sweepOrphans(client: WhmClient, list: string): Promise<void> {
  const [packages, accounts] = [await client.listPackages(), await client.listAccounts()];
  const used = new Set(accounts.map((a) => a.plan));
  for (const pkg of packages) {
    if (pkg.name.startsWith(`${list}${PACKAGE_SEPARATOR}`) && pkg.featureList === list && !used.has(pkg.name)) await client.deletePackage(pkg.name);
  }
}

/** Features an account holds through its package; undefined when its package or list cannot be found. */
export async function featuresOfAccount(client: WhmClient, account: WhmAccount): Promise<{ list: string; enabled: string[] } | undefined> {
  const pkg = (await client.listPackages()).find((p) => p.name === account.plan);
  const list = pkg ? await client.getFeatureList(pkg.featureList) : undefined;
  return list ? { list: list.name, enabled: enabledOf(list.features) } : undefined;
}
