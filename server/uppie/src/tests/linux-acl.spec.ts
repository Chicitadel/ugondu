/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Linux ACL Adapter Tests
 * File           : linux-acl.spec.ts
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-03
 * Classification : ENTERPRISE
 * Governance: Corporate Governed / Security Reviewed / Protocol Frozen
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import { LinuxAclAdapter, SUDOERS_TARGET } from '../adapters/linux-acl/LinuxAclAdapter';
import { parseGetfacl, effectivePerms, isSafePath } from '../adapters/linux-acl/LinuxAclParser';
import type { AclSystem } from '../adapters/linux-acl/LinuxAclSystem';
// @ts-ignore
import { __t } from '../../../shared/i18n';

declare var describe: any;
declare var it: any;
declare var expect: any;

// Output format produced by `getfacl --absolute-names` (acl 2.3.x)
const GETFACL = [
  '# file: /srv/data',
  '# owner: root',
  '# group: ops',
  'user::rwx',
  'user:alice:rw-',
  'group::r-x',
  'group:dev:r--',
  'mask::rwx',
  'other::---',
  'default:user:alice:r--',
  '',
  '# file: /srv/data/sub',
  '# owner: bob',
  '# group: ops',
  'user::rw-',
  'group::r--',
  'other::r--',
  '',
].join('\n');

interface Call { file: string; args: string[]; input?: string }

function fakeSystem(handlers: Record<string, (args: string[], input?: string) => string | Error> = {}) {
  const calls: Call[] = [];
  const files = new Map<string, string>();
  const system: AclSystem = {
    async exec(file, args, input) {
      calls.push({ file, args, input });
      const h = handlers[file];
      if (!h) return { stdout: '' };
      const r = h(args, input);
      if (r instanceof Error) throw r;
      return { stdout: r };
    },
    async readFile(p) { const v = files.get(p); if (v === undefined) throw new Error('ENOENT'); return v; },
    async writeFile(p, c) { files.set(p, c); },
    async rename(a, b) { files.set(b, files.get(a) as string); files.delete(a); },
    async removeFile(p) { files.delete(p); },
  };
  return { system, calls, files };
}

const ctx: any = { tenantId: 't', environmentId: '/srv/data', provider: 'LINUX_ACL', credentials: {} };

function rule(over: Record<string, any> = {}): any {
  return {
    ruleId: 'r1', version: '1.0.0', effect: 'ALLOW', conditions: [], scope: {}, purpose: 'test', owner: 'o',
    subject: { type: 'USER', id: 'alice' },
    action: { capability: 'Files.Read', operations: ['r', 'w'] },
    resource: { type: 'linux::file', scope: '/srv/data' },
    ...over,
  };
}

describe('POSIX ACL parser', () => {
  it('parses getfacl blocks including default entries', () => {
    const acls = parseGetfacl(GETFACL);
    expect(acls.length).toBe(2);
    expect(acls[0].path).toBe('/srv/data');
    expect(acls[0].owner).toBe('root');
    expect(acls[0].entries.some((e: any) => e.isDefault && e.qualifier === 'alice')).toBe(true);
  });

  it('applies owner, named-user, masked group and other rules in POSIX order', () => {
    const acl = parseGetfacl(GETFACL)[0];
    expect(effectivePerms(acl, 'root', [])).toBe('rwx');
    expect(effectivePerms(acl, 'alice', [])).toBe('rw-');
    expect(effectivePerms(acl, 'carol', ['dev'])).toBe('r--');
    expect(effectivePerms(acl, 'carol', ['ops'])).toBe('r-x');
    expect(effectivePerms(acl, 'mallory', [])).toBe('---');
  });

  it('clamps named entries to the mask', () => {
    const acl = parseGetfacl('# file: /x\n# owner: root\n# group: root\nuser::rwx\nuser:alice:rwx\ngroup::r--\nmask::r--\nother::---\n')[0];
    expect(effectivePerms(acl, 'alice', [])).toBe('r--');
  });

  it('rejects unsafe paths', () => {
    expect(isSafePath('/srv/data')).toBe(true);
    for (const bad of ['relative/path', '/srv/../etc', '/srv/data\n/etc', '', '-rf', '/a\u0000b']) {
      expect(isSafePath(bad)).toBe(false);
    }
  });
});

describe('LinuxAclAdapter compilation', () => {
  it('compiles an ALLOW rule into a setfacl entry for the subject principal', async () => {
    const policy = await new LinuxAclAdapter(fakeSystem().system).generate([rule()], ctx);
    const doc = policy.nativeDocument as any;
    expect(doc.acls[0].path).toBe('/srv/data');
    expect(doc.acls[0].entries).toEqual(['u:alice:rw-']);
    expect(policy.providerId).toBe('u:alice');
    expect(/^[a-f0-9]{64}$/.test(policy.digest)).toBe(true);
  });

  it('uses the g: tag for group subjects and never emits DENY rules', async () => {
    const policy = await new LinuxAclAdapter(fakeSystem().system).generate([
      rule({ subject: { type: 'GROUP', id: 'dev' }, action: { capability: 'x', operations: ['read'] } }),
      rule({ effect: 'DENY', subject: { type: 'USER', id: 'eve' } }),
    ], ctx);
    expect((policy.nativeDocument as any).acls[0].entries).toEqual(['g:dev:r--']);
  });

  it('compiles sudo rules with a root run-as user and absolute commands', async () => {
    const policy = await new LinuxAclAdapter(fakeSystem().system).generate([
      rule({ resource: { type: 'linux::sudo::Command', scope: 'host' }, action: { capability: 'sudo', operations: ['/bin/ls', '/usr/bin/id'] } }),
    ], ctx);
    expect((policy.nativeDocument as any).sudoers).toEqual(['alice ALL=(root) /bin/ls, /usr/bin/id']);
  });

  it('rejects injection attempts in principals, operations, commands and paths', async () => {
    const adapter = new LinuxAclAdapter(fakeSystem().system);
    for (const bad of [
      rule({ subject: { type: 'USER', id: 'alice;rm -rf /' } }),
      rule({ action: { capability: 'x', operations: ['r', 'rwx,u:root:rwx'] } }),
      rule({ resource: { type: 'linux::file', scope: '/srv/../etc/shadow' } }),
      rule({ resource: { type: 'linux::sudo::Command', scope: 'h' }, action: { capability: 'x', operations: ['/bin/ls; reboot'] } }),
    ]) {
      let threw = false;
      try { await adapter.generate([bad], ctx); } catch { threw = true; }
      expect(threw).toBe(true);
    }
  });

  it('refuses to mix ACL and sudo rules in one policy', async () => {
    let message = '';
    try {
      await new LinuxAclAdapter(fakeSystem().system).generate([
        rule(), rule({ resource: { type: 'linux::sudo::Command', scope: 'h' }, action: { capability: 'x', operations: ['/bin/ls'] } }),
      ], ctx);
    } catch (e: any) { message = e.message; }
    expect(message).toBe(__t('linux_acl.validate.mixed_document'));
  });

  it('validates entry syntax and the 32-entry limit', async () => {
    const adapter = new LinuxAclAdapter(fakeSystem().system);
    const many = Array.from({ length: 33 }, (_, i) => `u:user${i}:r--`);
    const res = await adapter.validate({ providerId: 'x', providerType: 'LINUX_ACL', digest: '', nativeDocument: { acls: [{ path: '/srv', entries: [...many, 'u:bad name:rw-'] }], sudoers: [] } }, ctx);
    expect(res.valid).toBe(false);
    expect(res.errors).toContain(__t('linux_acl.validate.too_many_entries', { count: 34, limit: 32 }));
    expect(res.errors).toContain(__t('linux_acl.validate.invalid_entry', { entry: 'u:bad name:rw-' }));
  });
});

describe('LinuxAclAdapter operations', () => {
  it('discovers extended ACL policies and assignments from getfacl output', async () => {
    const { system, calls } = fakeSystem({ getfacl: () => GETFACL });
    const adapter = new LinuxAclAdapter(system);
    const policies = await adapter.discoverPolicies(ctx);
    expect(policies.length).toBe(1); // /srv/data/sub has only base entries
    expect((policies[0].nativeDocument as any).acls[0].entries).toContain('u:alice:rw-');
    const assignments = await adapter.discoverAssignments(ctx);
    expect(assignments['u:alice']).toContain('/srv/data');
    expect(calls[0].args).toContain('--recursive');
  });

  it('refuses to discover with an unsafe root', async () => {
    let threw = false;
    try { await new LinuxAclAdapter(fakeSystem().system).discoverPolicies({ ...ctx, environmentId: '../etc' }); } catch { threw = true; }
    expect(threw).toBe(true);
  });

  it('reads identities and groups from passwd/group files', async () => {
    const { system, files } = fakeSystem();
    files.set('/etc/passwd', 'root:x:0:0:root:/root:/bin/bash\nalice:x:1000:1000:Alice A,,,:/home/alice:/bin/zsh\n');
    files.set('/etc/group', 'dev:x:100:alice,bob\nops:x:101:\n');
    const adapter = new LinuxAclAdapter(system);
    expect((await adapter.discoverIdentities(ctx)).map((i) => i.id)).toEqual(['root', 'alice']);
    expect((await adapter.discoverGroups(ctx))[0].members).toEqual(['alice', 'bob']);
  });

  it('evaluates effective authority from the real ACL and the actor group list', async () => {
    const { system } = fakeSystem({ getfacl: () => GETFACL, id: () => 'carol dev' });
    const adapter = new LinuxAclAdapter(system);
    const result = await adapter.discoverEffectiveAuthority('carol', '/srv/data', ctx);
    const states = Object.fromEntries(result.permissions.map((p: any) => [p.capability, p.state]));
    expect(states).toEqual({ read: 'GRANTED', write: 'DENIED', execute: 'DENIED' });
    expect(await adapter.evaluate(rule({ subject: { type: 'USER', id: 'carol' }, action: { capability: 'x', operations: ['r'] } }), ctx)).toBe('GRANTED');
    expect(await adapter.evaluate(rule({ subject: { type: 'USER', id: 'carol' }, action: { capability: 'x', operations: ['w'] } }), ctx)).toBe('DENIED');
  });

  it('attaches with an argument vector (no shell) and rejects traversal targets', async () => {
    const { system, calls } = fakeSystem();
    const adapter = new LinuxAclAdapter(system);
    const policy = await adapter.generate([rule()], ctx);
    const ok = await adapter.attach(policy, '/srv/data', ctx);
    expect(ok.success).toBe(true);
    expect(calls[0]).toEqual({ file: 'setfacl', args: ['-m', 'u:alice:rw-', '--', '/srv/data'], input: undefined });
    const bad = await adapter.attach(policy, '/srv/../etc', ctx);
    expect(bad.success).toBe(false);
    const none = await adapter.attach(policy, '/srv/other', ctx);
    expect(none.errors).toContain(__t('linux_acl.attach.no_entries'));
  });

  it('detaches by specifier and rejects malformed specifiers', async () => {
    const { system, calls } = fakeSystem();
    const adapter = new LinuxAclAdapter(system);
    expect((await adapter.detach('u:alice,g:dev', '/srv/data', ctx)).success).toBe(true);
    expect(calls[0].args).toEqual(['-x', 'u:alice,g:dev', '--', '/srv/data']);
    expect((await adapter.detach('u:alice; reboot', '/srv/data', ctx)).success).toBe(false);
  });

  it('installs sudoers only after visudo validation and removes the temp file on failure', async () => {
    const good = fakeSystem();
    const adapter = new LinuxAclAdapter(good.system);
    const policy = await adapter.generate([rule({ resource: { type: 'linux::sudo::Command', scope: 'h' }, action: { capability: 'x', operations: ['/bin/ls'] } })], ctx);
    expect((await adapter.attach(policy, SUDOERS_TARGET, ctx)).success).toBe(true);
    expect(good.files.get(`${SUDOERS_TARGET}/${policy.providerId}`)).toBe('alice ALL=(root) /bin/ls\n');
    expect(good.calls[0].file).toBe('visudo');

    const bad = fakeSystem({ visudo: () => new Error('syntax error') });
    const res = await new LinuxAclAdapter(bad.system).attach(policy, SUDOERS_TARGET, ctx);
    expect(res.success).toBe(false);
    expect(bad.files.size).toBe(0);
  });

  it('update restores the previous ACL when applying the new one fails', async () => {
    let setCalls = 0;
    const { system, calls } = fakeSystem({
      getfacl: () => GETFACL,
      setfacl: (args) => { setCalls++; return args[0] === '-m' ? new Error('Operation not supported') : ''; },
    });
    const res = await new LinuxAclAdapter(system).update('/srv/data', [rule()], ctx);
    expect(res.success).toBe(false);
    const restore = calls.find((c) => c.args[0] === '--set-file=-');
    expect(restore?.input).toBe(GETFACL);
    expect(setCalls).toBe(3);
  });

  it('retire captures a snapshot and restore replays it only for the same path', async () => {
    let stripped = false;
    const { system, calls } = fakeSystem({
      getfacl: () => (stripped ? '# file: /srv/data\n# owner: root\n# group: ops\nuser::rwx\ngroup::r-x\nother::---\n' : GETFACL),
      setfacl: (args) => { if (args[0] === '-b') stripped = true; return ''; },
    });
    const adapter = new LinuxAclAdapter(system);
    const retired = await adapter.retire({ policyId: '/srv/data', shadowPeriodDays: 0, approvedBy: 'a', retentionDays: 1 }, ctx);
    expect(retired.success).toBe(true);
    expect(retired.rollbackReference).toBe(GETFACL);

    const cert: any = { policyId: '/srv/data', rollbackReference: retired.rollbackReference };
    expect((await adapter.restore(cert, ctx)).success).toBe(true);
    expect(calls[calls.length - 1].input).toBe(GETFACL);
    expect((await adapter.restore({ ...cert, policyId: '/srv/other' }, ctx)).success).toBe(false);
    expect((await adapter.restore({ ...cert, rollbackReference: '' }, ctx)).errors).toContain(__t('linux_acl.restore.no_snapshot'));
  });

  it('reconciles desired rules against observed entries', async () => {
    const adapter = new LinuxAclAdapter(fakeSystem().system);
    const observed = [{ providerId: 'x', providerType: 'LINUX_ACL', digest: '', nativeDocument: { acls: [{ path: '/srv/data', entries: ['u:alice:r--', 'u:bob:rw-'] }], sudoers: [] } }] as any;
    const plan = await adapter.reconcile([
      rule({ ruleId: 'same', subject: { type: 'USER', id: 'alice' }, action: { capability: 'x', operations: ['r'] } }),
      rule({ ruleId: 'new', subject: { type: 'USER', id: 'carol' }, action: { capability: 'x', operations: ['r'] } }),
    ], observed, ctx);
    expect(plan.noChange).toEqual(['same']);
    expect(plan.toAdd.map((r: any) => r.ruleId)).toEqual(['new']);
    expect(plan.toRemove).toEqual(['/srv/data|u:bob']);
  });
});
