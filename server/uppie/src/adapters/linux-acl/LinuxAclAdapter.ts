/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Linux ACL Adapter
 * File           : LinuxAclAdapter.ts
 * Version        : 1.1.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-02
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

import type {
  IPolicyProviderAdapter, AdapterContext, AdapterCapabilityDeclaration, ProviderNativePolicy,
  PolicyValidationResult, AttachResult, DetachResult, UpdateResult, CloneResult,
  ObservationWindow, UsageObservation, DependencyReport, ConflictReport, ReconciliationPlan,
  RetirementPlan, RetirementResult, RestoreResult, PolicySimulationResult,
} from '../IPolicyProviderAdapter';
import type {
  AuthorizationRule, AuthorizationConstraints, EffectiveAuthorityResult, PolicyRetirementCertificate,
} from '../../types/index';
import { LINUX_ACL_CONSTRAINTS } from './LinuxAclConstraints';
import { AclSystem, nodeAclSystem } from './LinuxAclSystem';
import {
  ACL_ENTRY_LIMIT, SUDO_RESOURCE_TYPE, compileAclEntry, compilePerms, compileSudoers, effectivePerms,
  entriesToSpec, extendedEntries, isSafePath, isValidEntry, isValidSpec, parseGetfacl,
} from './LinuxAclParser';

/** Attach/detach target that selects the sudoers drop-in directory instead of a filesystem object. */
export const SUDOERS_TARGET = '/etc/sudoers.d';
const SUDOERS_LINE = /^%?[A-Za-z0-9_][A-Za-z0-9_.\-]*\$? ALL=\(root\) \/[A-Za-z0-9_./+\-]+(, \/[A-Za-z0-9_./+\-]+)*$/;
const SUDOERS_FILE = /^ugondu-[a-f0-9]{16}$/;

interface AclDocument { acls: Array<{ path: string; entries: string[] }>; sudoers: string[] }

const sha256 = (v: string): string => createHash('sha256').update(v).digest('hex');
const fail = (key: string, params?: Record<string, string | number>): Error => new Error(__t(key, params));

/**
 * LinuxAclAdapter — UPPIE provider adapter for Linux POSIX ACL and sudo rules.
 *
 * - POSIX ACL has no DENY primitive: DENY rules are never compiled; absence of permission is the deny.
 * - ACL entries are per filesystem object, so a policy is a set of (path, entries) pairs and attach() targets one path.
 * - sudo rules are written as validated drop-ins under /etc/sudoers.d (target SUDOERS_TARGET).
 * - ACL/sudo are never mixed in one policy; providerId is the setfacl -x specifier (ACL) or the drop-in file name (sudo).
 * - Every OS interaction goes through AclSystem with an argument vector; nothing is passed to a shell.
 */
export class LinuxAclAdapter implements IPolicyProviderAdapter {
  readonly providerType = 'LINUX_ACL' as const;

  readonly capabilities: AdapterCapabilityDeclaration = {
    discoverPolicies: 'SUPPORTED', discoverAssignments: 'SUPPORTED', discoverIdentities: 'SUPPORTED_WITH_LIMITS',
    discoverGroups: 'SUPPORTED_WITH_LIMITS', discoverRoles: 'UNSUPPORTED', discoverEffectiveAuthority: 'SUPPORTED',
    evaluate: 'SUPPORTED', simulate: 'NOT_OBSERVABLE', generate: 'SUPPORTED', validate: 'SUPPORTED',
    attach: 'SUPPORTED', detach: 'SUPPORTED', update: 'SUPPORTED', clone: 'SUPPORTED',
    observeUsage: 'NOT_OBSERVABLE', detectUnused: 'NOT_OBSERVABLE', findDependencies: 'NOT_OBSERVABLE',
    findConflicts: 'NOT_OBSERVABLE', getConstraints: 'SUPPORTED', reconcile: 'SUPPORTED',
    retire: 'SUPPORTED', restore: 'SUPPORTED',
  };

  constructor(private readonly system: AclSystem = nodeAclSystem) {}

  private async getfacl(paths: string[], recursive = false) {
    const { stdout } = await this.system.exec('getfacl', ['--absolute-names', ...(recursive ? ['--recursive'] : []), '--', ...paths]);
    return { raw: stdout, acls: parseGetfacl(stdout) };
  }

  private requirePath(p: string): string {
    if (!isSafePath(p)) throw fail('linux_acl.validate.invalid_path', { path: p });
    return p;
  }

  async discoverPolicies(context: AdapterContext): Promise<ProviderNativePolicy[]> {
    const { acls } = await this.getfacl([this.requirePath(context.environmentId)], true);
    return acls
      .map((a) => ({ path: a.path, entries: extendedEntries(a) }))
      .filter((a) => a.entries.length > 0)
      .map((a) => this.toNative({ acls: [a], sudoers: [] }, entriesToSpec(a.entries)));
  }

  async discoverAssignments(context: AdapterContext): Promise<Record<string, string[]>> {
    const { acls } = await this.getfacl([this.requirePath(context.environmentId)], true);
    const out: Record<string, string[]> = {};
    for (const acl of acls) {
      for (const e of extendedEntries(acl)) {
        const principal = e.split(':').slice(0, -1).join(':');
        (out[principal] ||= []).push(acl.path);
      }
    }
    return out;
  }

  async discoverIdentities(_context: AdapterContext): Promise<Array<{ id: string; type: string; displayName: string }>> {
    const passwd = await this.system.readFile('/etc/passwd');
    return passwd.split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(':'))
      .filter((f) => f.length >= 5).map((f) => ({ id: f[0], type: 'USER', displayName: f[4].split(',')[0] || f[0] }));
  }

  async discoverGroups(_context: AdapterContext): Promise<Array<{ id: string; displayName: string; members: string[] }>> {
    const group = await this.system.readFile('/etc/group');
    return group.split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split(':'))
      .filter((f) => f.length >= 4).map((f) => ({ id: f[0], displayName: f[0], members: f[3] ? f[3].split(',') : [] }));
  }

  async discoverRoles(_context: AdapterContext): Promise<Array<{ id: string; displayName: string; policies: string[] }>> {
    return []; // UNSUPPORTED: POSIX ACL has no role concept
  }

  private async effective(actor: string, resource: string): Promise<string> {
    const { acls } = await this.getfacl([this.requirePath(resource)]);
    if (acls.length === 0) return '---';
    const { stdout } = await this.system.exec('id', ['-Gn', '--', actor]);
    return effectivePerms(acls[0], actor, stdout.trim().split(/\s+/).filter(Boolean));
  }

  async discoverEffectiveAuthority(actor: string, resource: string, _context: AdapterContext): Promise<EffectiveAuthorityResult> {
    const perms = await this.effective(actor, resource);
    return {
      actorId: actor, resourceId: resource, evaluatedAt: new Date().toISOString(), evaluationMethod: 'PROVIDER_API',
      permissions: [['read', 0], ['write', 1], ['execute', 2]].map(([capability, i]) => ({
        capability: capability as string, resource, confidence: 'HIGH' as const, sourcePolicies: [], denyPolicies: [],
        state: perms[i as number] !== '-' ? ('GRANTED' as const) : ('DENIED' as const),
      })),
    };
  }

  async evaluate(rule: AuthorizationRule, _context: AdapterContext): Promise<'GRANTED' | 'DENIED' | 'UNKNOWN'> {
    if (rule.resource.type === SUDO_RESOURCE_TYPE) {
      try {
        const { stdout } = await this.system.exec('sudo', ['-n', '-l', '-U', rule.subject.id]);
        return rule.action.operations.every((c) => stdout.includes(c)) ? 'GRANTED' : 'DENIED';
      } catch {
        return 'UNKNOWN';
      }
    }
    const needed = compilePerms(rule.action.operations);
    if ('invalid' in needed) return 'UNKNOWN';
    const have = await this.effective(rule.subject.id, rule.resource.scope);
    return [0, 1, 2].every((i) => needed.perms[i] === '-' || have[i] !== '-') ? 'GRANTED' : 'DENIED';
  }

  async simulate(_rules: AuthorizationRule[], _context: AdapterContext): Promise<PolicySimulationResult> {
    // NOT_OBSERVABLE: the kernel exposes no dry-run for ACL changes
    return { allowed: [], denied: [], unchanged: [], confidence: 'LOW',
      blastRadius: { policyId: '', dependentRoles: [], dependentActors: [], dependentServices: [], blastRadius: 'MINIMAL' } };
  }

  private toNative(doc: AclDocument, providerId?: string): ProviderNativePolicy {
    const digest = sha256(JSON.stringify(doc));
    return { providerId: providerId ?? `ugondu-${digest.slice(0, 16)}`, providerType: 'LINUX_ACL', nativeDocument: doc, digest };
  }

  async generate(rules: AuthorizationRule[], _context: AdapterContext): Promise<ProviderNativePolicy> {
    const byPath = new Map<string, string[]>();
    const sudoers: string[] = [];
    for (const rule of rules.filter((r) => r.effect === 'ALLOW')) { // DENY has no POSIX ACL expression
      if (rule.resource.type === SUDO_RESOURCE_TYPE) {
        const c = compileSudoers(rule);
        if ('invalid' in c) throw fail('linux_acl.validate.invalid_command', { command: c.invalid });
        sudoers.push(c.line);
      } else {
        const c = compileAclEntry(rule);
        if ('invalid' in c) throw fail('linux_acl.validate.invalid_operation', { operation: c.invalid });
        (byPath.get(this.requirePath(rule.resource.scope)) ?? byPath.set(rule.resource.scope, []).get(rule.resource.scope)!).push(c.entry);
      }
    }
    if (sudoers.length > 0 && byPath.size > 0) throw fail('linux_acl.validate.mixed_document');
    const acls = [...byPath].map(([path, entries]) => ({ path, entries: [...new Set(entries)] }));
    const doc: AclDocument = { acls, sudoers: [...new Set(sudoers)] };
    return this.toNative(doc, acls.length > 0 ? entriesToSpec(acls.flatMap((a) => a.entries)) : undefined);
  }

  async validate(nativePolicy: ProviderNativePolicy, _context: AdapterContext): Promise<PolicyValidationResult> {
    const doc = nativePolicy.nativeDocument as Partial<AclDocument>;
    const errors: string[] = [];
    for (const acl of doc.acls ?? []) {
      if (!isSafePath(acl.path)) errors.push(__t('linux_acl.validate.invalid_path', { path: acl.path }));
      if (acl.entries.length > ACL_ENTRY_LIMIT) errors.push(__t('linux_acl.validate.too_many_entries', { count: acl.entries.length, limit: ACL_ENTRY_LIMIT }));
      for (const e of acl.entries) if (!isValidEntry(e)) errors.push(__t('linux_acl.validate.invalid_entry', { entry: e }));
    }
    for (const line of doc.sudoers ?? []) if (!SUDOERS_LINE.test(line)) errors.push(__t('linux_acl.validate.invalid_entry', { entry: line }));
    return { valid: errors.length === 0, errors, warnings: [] };
  }

  async attach(nativePolicy: ProviderNativePolicy, target: string, _context: AdapterContext): Promise<AttachResult> {
    try {
      const doc = nativePolicy.nativeDocument as AclDocument;
      const check = await this.validate(nativePolicy, _context);
      if (!check.valid) return { success: false, providerRef: '', attachedAt: '', errors: check.errors };
      if (target === SUDOERS_TARGET) {
        await this.writeSudoers(nativePolicy, doc);
      } else {
        const entries = doc.acls.find((a) => a.path === this.requirePath(target))?.entries;
        if (!entries || entries.length === 0) {
          return { success: false, providerRef: '', attachedAt: '', errors: [__t('linux_acl.attach.no_entries')] };
        }
        await this.system.exec('setfacl', ['-m', entries.join(','), '--', target]);
      }
      return { success: true, providerRef: nativePolicy.providerId, attachedAt: new Date().toISOString(), errors: [] };
    } catch (err: any) {
      return { success: false, providerRef: '', attachedAt: '', errors: [__t('linux_acl.attach.failed', { error: err.message })] };
    }
  }

  /** Writes a drop-in to a temporary name (ignored by sudo), validates it with visudo, then atomically renames it. */
  private async writeSudoers(policy: ProviderNativePolicy, doc: AclDocument): Promise<void> {
    if (!SUDOERS_FILE.test(policy.providerId)) throw fail('linux_acl.validate.invalid_spec', { spec: policy.providerId });
    const finalPath = `${SUDOERS_TARGET}/${policy.providerId}`;
    const tmp = `${finalPath}.tmp`;
    await this.system.removeFile(tmp);
    await this.system.writeFile(tmp, `${doc.sudoers.join('\n')}\n`, 0o440);
    try {
      await this.system.exec('visudo', ['-c', '-f', tmp]);
      await this.system.rename(tmp, finalPath);
    } catch (err: any) {
      await this.system.removeFile(tmp);
      throw fail('linux_acl.validate.sudoers_check_failed', { error: err.message });
    }
  }

  async detach(policyId: string, target: string, _context: AdapterContext): Promise<DetachResult> {
    try {
      if (target === SUDOERS_TARGET) {
        if (!SUDOERS_FILE.test(policyId)) throw fail('linux_acl.validate.invalid_spec', { spec: policyId });
        await this.system.removeFile(`${SUDOERS_TARGET}/${policyId}`);
      } else {
        if (!isValidSpec(policyId)) throw fail('linux_acl.validate.invalid_spec', { spec: policyId });
        await this.system.exec('setfacl', ['-x', policyId, '--', this.requirePath(target)]);
      }
      return { success: true, detachedAt: new Date().toISOString(), errors: [] };
    } catch (err: any) {
      return { success: false, errors: [__t('linux_acl.detach.failed', { error: err.message })] };
    }
  }

  /** Replaces the extended ACL of one object; the previous ACL is restored if applying the new one fails. */
  async update(policyId: string, newRules: AuthorizationRule[], _context: AdapterContext): Promise<UpdateResult> {
    let snapshot = '';
    try {
      const path = this.requirePath(policyId);
      const entries = newRules.filter((r) => r.effect === 'ALLOW' && r.resource.scope === path).map((r) => {
        const c = compileAclEntry(r);
        if ('invalid' in c) throw fail('linux_acl.validate.invalid_operation', { operation: c.invalid });
        return c.entry;
      });
      snapshot = (await this.getfacl([path])).raw;
      await this.system.exec('setfacl', ['-b', '--', path]);
      if (entries.length > 0) await this.system.exec('setfacl', ['-m', [...new Set(entries)].join(','), '--', path]);
      return { success: true, version: sha256(entries.join(',')).slice(0, 16), errors: [] };
    } catch (err: any) {
      if (snapshot) await this.system.exec('setfacl', ['--set-file=-', '--', policyId], snapshot).catch((e) => console.warn('Failed to restore ACL snapshot: ' + String(e)));
      return { success: false, version: '', errors: [__t('linux_acl.update.failed', { error: err.message })] };
    }
  }

  async clone(policyId: string, newName: string, _context: AdapterContext): Promise<CloneResult> {
    try {
      const { raw } = await this.getfacl([this.requirePath(policyId)]);
      await this.system.exec('setfacl', ['--set-file=-', '--', this.requirePath(newName)], raw);
      return { success: true, clonedId: newName, errors: [] };
    } catch (err: any) {
      return { success: false, clonedId: '', errors: [__t('linux_acl.clone.failed', { error: err.message })] };
    }
  }

  async observeUsage(policyId: string, _window: ObservationWindow, _context: AdapterContext): Promise<UsageObservation> {
    // NOT_OBSERVABLE: the kernel keeps no per-ACL access history
    return { policyId, observedUsages: 0, classification: 'UNKNOWN', scheduledJobDetected: false, failoverPathDetected: false, emergencyPathDetected: false };
  }

  async detectUnused(_context: AdapterContext, _thresholdDays: number): Promise<UsageObservation[]> {
    return []; // NOT_OBSERVABLE
  }

  async findDependencies(policyId: string, _context: AdapterContext): Promise<DependencyReport> {
    return { policyId, dependentRoles: [], dependentActors: [], dependentServices: [], blastRadius: 'MINIMAL' };
  }

  async findConflicts(_rules: AuthorizationRule[], _context: AdapterContext): Promise<ConflictReport> {
    return { conflicts: [] }; // POSIX ACL is additive: with no DENY there are no structural conflicts
  }

  async getConstraints(_context: AdapterContext): Promise<AuthorizationConstraints> {
    return LINUX_ACL_CONSTRAINTS;
  }

  async reconcile(desired: AuthorizationRule[], observed: ProviderNativePolicy[], _context: AdapterContext): Promise<ReconciliationPlan> {
    const key = (path: string, entry: string) => `${path}|${entry.split(':').slice(0, -1).join(':')}`;
    const seen = new Map<string, string>(); // path|principal -> entry
    for (const p of observed) for (const a of (p.nativeDocument as AclDocument).acls ?? []) for (const e of a.entries) seen.set(key(a.path, e), e);
    const plan: ReconciliationPlan = { toAdd: [], toRemove: [], toUpdate: [], noChange: [] };
    const wanted = new Set<string>();
    for (const rule of desired.filter((r) => r.effect === 'ALLOW' && r.resource.type !== SUDO_RESOURCE_TYPE)) {
      const c = compileAclEntry(rule);
      if ('invalid' in c) continue;
      const k = key(rule.resource.scope, c.entry);
      wanted.add(k);
      const current = seen.get(k);
      if (current === undefined) plan.toAdd.push(rule);
      else if (current === c.entry) plan.noChange.push(rule.ruleId);
      else plan.toUpdate.push({ ruleId: rule.ruleId, newRule: rule });
    }
    for (const k of seen.keys()) if (!wanted.has(k)) plan.toRemove.push(k);
    return plan;
  }

  async retire(plan: RetirementPlan, _context: AdapterContext): Promise<RetirementResult> {
    try {
      const path = this.requirePath(plan.policyId);
      const { raw } = await this.getfacl([path]);
      await this.system.exec('setfacl', ['-b', '--', path]);
      const after = (await this.getfacl([path])).acls[0];
      if (after && extendedEntries(after).length > 0) throw fail('linux_acl.retire.failed', { error: path });
      return { success: true, errors: [], rollbackReference: raw, detachmentEvidence: sha256(raw) };
    } catch (err: any) {
      return { success: false, errors: [__t('linux_acl.retire.failed', { error: err.message })] };
    }
  }

  async restore(certificate: PolicyRetirementCertificate, _context: AdapterContext): Promise<RestoreResult> {
    try {
      const path = this.requirePath(certificate.policyId);
      const snapshot = certificate.rollbackReference;
      if (!snapshot) return { success: false, restoredId: '', errors: [__t('linux_acl.restore.no_snapshot')] };
      if (parseGetfacl(snapshot)[0]?.path !== path) {
        return { success: false, restoredId: '', errors: [__t('linux_acl.restore.path_mismatch', { path })] };
      }
      await this.system.exec('setfacl', ['--set-file=-', '--', path], snapshot);
      return { success: true, restoredId: path, errors: [] };
    } catch (err: any) {
      return { success: false, restoredId: '', errors: [__t('linux_acl.restore.failed', { error: err.message })] };
    }
  }
}
