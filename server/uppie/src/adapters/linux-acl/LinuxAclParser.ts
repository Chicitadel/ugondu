/******************************************************************************
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : UPPIE — Linux ACL Parser & Compiler
 * File           : LinuxAclParser.ts
 * Version        : 1.0.0
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
 *
 * Standards:
 * - ISO 27001 / SOC 2 / OWASP ASVS 5.0 / NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers. All Rights Reserved.
 ******************************************************************************/

import type { AuthorizationRule } from '../../types/index';

export type AclTag = 'user' | 'group' | 'mask' | 'other';

export interface AclEntry {
  tag:       AclTag;
  qualifier: string;   // empty for owner / owning group / mask / other
  perms:     string;   // 'rwx' positional, '-' for absent bits
  isDefault: boolean;
}

export interface ParsedAcl {
  path:    string;
  owner:   string;
  group:   string;
  entries: AclEntry[];
}

export const SUDO_RESOURCE_TYPE = 'linux::sudo::Command';
export const ACL_ENTRY_LIMIT = 32;

const PRINCIPAL = /^[A-Za-z0-9_][A-Za-z0-9_.\-]*\$?$/;
const COMMAND = /^\/[A-Za-z0-9_./+\-]+$/;
const ENTRY = /^(d:)?(u|g):[A-Za-z0-9_][A-Za-z0-9_.\-]*\$?:[r-][w-][x-]$/;
const GETFACL_ENTRY = /^(default:)?(user|group|mask|other):([^:]*):([r-][w-][x-])(?:\s+#effective:[r-][w-][x-])?\s*$/;

/** Absolute path, no control characters, no traversal segments. */
export function isSafePath(p: string): boolean {
  return typeof p === 'string' && p.length > 1 && p.length <= 4096 && p.startsWith('/')
    && !/[\u0000-\u001f\u007f]/.test(p) && !p.split('/').includes('..');
}

export function isValidPrincipal(name: string): boolean {
  return PRINCIPAL.test(name);
}

export function isValidEntry(entry: string): boolean {
  return ENTRY.test(entry);
}

export function isValidCommand(cmd: string): boolean {
  return COMMAND.test(cmd) && !cmd.split('/').includes('..');
}

const OPERATION_BITS: Record<string, number> = { r: 0, read: 0, w: 1, write: 1, x: 2, execute: 2 };

/** Compiles AIR operations into a positional rwx string; returns the offending token on failure. */
export function compilePerms(operations: string[]): { perms: string } | { invalid: string } {
  const bits = ['-', '-', '-'];
  for (const op of operations) {
    const idx = OPERATION_BITS[op.toLowerCase()];
    if (idx === undefined) return { invalid: op };
    bits[idx] = 'rwx'[idx];
  }
  return { perms: bits.join('') };
}

/** Compiles one ALLOW rule into a setfacl entry spec (u:name:rwx / g:name:rwx). */
export function compileAclEntry(rule: AuthorizationRule): { entry: string } | { invalid: string } {
  if (!isValidPrincipal(rule.subject.id)) return { invalid: rule.subject.id };
  const compiled = compilePerms(rule.action.operations);
  if ('invalid' in compiled) return compiled;
  const tag = rule.subject.type === 'GROUP' ? 'g' : 'u';
  return { entry: `${tag}:${rule.subject.id}:${compiled.perms}` };
}

/** Compiles a sudo rule into a sudoers line; the run-as user is restricted to root and a password is required. */
export function compileSudoers(rule: AuthorizationRule): { line: string } | { invalid: string } {
  if (!isValidPrincipal(rule.subject.id)) return { invalid: rule.subject.id };
  for (const cmd of rule.action.operations) {
    if (!isValidCommand(cmd)) return { invalid: cmd };
  }
  if (rule.action.operations.length === 0) return { invalid: '' };
  const who = rule.subject.type === 'GROUP' ? `%${rule.subject.id}` : rule.subject.id;
  return { line: `${who} ALL=(root) ${rule.action.operations.join(', ')}` };
}

/** setfacl -x / detach specifier: entries without their permission field (u:alice,g:dev). */
export function entriesToSpec(entries: string[]): string {
  return entries.map((e) => e.split(':').slice(0, -1).join(':')).join(',');
}

export function isValidSpec(spec: string): boolean {
  return spec.length > 0 && spec.split(',').every((s) => /^(d:)?(u|g):[A-Za-z0-9_][A-Za-z0-9_.\-]*\$?$/.test(s));
}

/** Parses `getfacl --absolute-names` output (one block per object, blank-line separated). */
export function parseGetfacl(output: string): ParsedAcl[] {
  const acls: ParsedAcl[] = [];
  let current: ParsedAcl | null = null;
  for (const raw of output.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.startsWith('# file: ')) {
      current = { path: line.slice(8), owner: '', group: '', entries: [] };
      acls.push(current);
    } else if (current && line.startsWith('# owner: ')) {
      current.owner = line.slice(9);
    } else if (current && line.startsWith('# group: ')) {
      current.group = line.slice(9);
    } else if (current) {
      const m = GETFACL_ENTRY.exec(line);
      if (m) {
        current.entries.push({ tag: m[2] as AclTag, qualifier: m[3], perms: m[4], isDefault: Boolean(m[1]) });
      }
    }
  }
  return acls;
}

function maskPerms(acl: ParsedAcl): string {
  return acl.entries.find((e) => !e.isDefault && e.tag === 'mask')?.perms ?? 'rwx';
}

function intersect(a: string, b: string): string {
  return [0, 1, 2].map((i) => (a[i] !== '-' && b[i] !== '-' ? a[i] : '-')).join('');
}

/** POSIX.1e access check order: owner, named user, owning/named groups (masked), other. */
export function effectivePerms(acl: ParsedAcl, actor: string, actorGroups: string[]): string {
  const entries = acl.entries.filter((e) => !e.isDefault);
  const mask = maskPerms(acl);
  if (actor === acl.owner) return entries.find((e) => e.tag === 'user' && e.qualifier === '')?.perms ?? '---';
  const named = entries.find((e) => e.tag === 'user' && e.qualifier === actor);
  if (named) return intersect(named.perms, mask);
  const groupHits = entries.filter((e) => e.tag === 'group'
    && ((e.qualifier === '' && actorGroups.includes(acl.group)) || (e.qualifier !== '' && actorGroups.includes(e.qualifier))));
  if (groupHits.length > 0) {
    const union = ['-', '-', '-'];
    for (const g of groupHits) {
      const masked = intersect(g.perms, mask);
      for (let i = 0; i < 3; i++) if (masked[i] !== '-') union[i] = masked[i];
    }
    return union.join('');
  }
  return entries.find((e) => e.tag === 'other')?.perms ?? '---';
}

/** Named user/group entries (access and default) as setfacl specs, excluding the base owner/group/mask/other. */
export function extendedEntries(acl: ParsedAcl): string[] {
  return acl.entries
    .filter((e) => (e.tag === 'user' || e.tag === 'group') && e.qualifier !== '')
    .map((e) => `${e.isDefault ? 'd:' : ''}${e.tag === 'user' ? 'u' : 'g'}:${e.qualifier}:${e.perms}`);
}
