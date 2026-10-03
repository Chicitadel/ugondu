// Mutation check for the GCP IAM adapter: each mutant must be caught by at least one failing test.
const fs = require('fs');
const { execSync } = require('child_process');
const root = 'D:\\ujomor-platform\\products\\ugondu\\';
const A = 'server\\uppie\\src\\adapters\\gcp-iam\\';
const H = A + 'GcpIamHelpers.ts', AD = A + 'GcpIamAdapter.ts', M = A + 'GcpIamModel.ts', D = A + 'GcpIamDiscovery.ts';
const mutations = [
  [H, "if (rule.effect !== 'ALLOW') throw fail", 'if (false) throw fail'],
  [H, "if (!chain.includes(resource)) throw fail('uppie.adapter.gcp.scope_outside_environment'", "if (false) throw fail('uppie.adapter.gcp.scope_outside_environment'"],
  [H, "if (cond.type !== 'TIME_BOUND') throw unsupported();", 'if (false) throw unsupported();'],
  [H, 'ends.sort()[0]', 'ends.sort().pop()'],
  [H, 'starts.sort().pop()', 'starts.sort()[0]'],
  [H, 'if (shapes.size > 1) throw', 'if (false) throw'],
  [H, 'if (existing?.members.some((m) => sameMember(m, member))) return { policy, changed: false };', 'if (false) return { policy, changed: false };'],
  [H, '.filter((b) => b.members.length > 0)', '.filter(() => true)'],
  [H, 'principalCount(next) > MAX_PRINCIPALS', 'principalCount(next) > 999999'],
  [H, 'if (at < 0) throw fail', 'if (false) throw fail'],
  [H, 'chain.slice(0, end + 1)', '[project]'],
  [H, 'e.code !== GRPC.ABORTED', 'true'],
  [H, 'a.toLowerCase() === b.toLowerCase()', 'a === b'],
  [H, '!ROLE_NAME.test(role.name)', 'false'],
  [H, 'role.includedPermissions.length > MAX_PERMISSIONS', 'role.includedPermissions.length > 99999'],
  [AD, 'if (!samePermissions(existing.includedPermissions, document.role.includedPermissions)) throw fail', 'if (false) throw fail'],
  [AD, 'if (existing.deleted) await client.undeleteRole(name, existing.etag);', ''],
  [AD, 'if (count > 0) throw fail', 'if (false) throw fail'],
  [AD, "if (roleParentOfName(name) !== projectOf(context)) throw fail('uppie.adapter.gcp.shared_role', { name });", ''],
  [AD, "if (document.condition) throw fail('uppie.adapter.gcp.update_condition_change'", "if (false) throw fail('uppie.adapter.gcp.update_condition_change'"],
  [AD, "if (role.deleted) throw fail('uppie.adapter.gcp.already_retired'", "if (false) throw fail('uppie.adapter.gcp.already_retired'"],
  [AD, 'if (!samePermissions(existing.includedPermissions, snapshot.includedPermissions)) throw', 'if (false) throw'],
  [AD, 'if (existing.deleted) await client.undeleteRole(snapshot.name, existing.etag);', ''],
  [AD, 'roleParentOfName(policyId) === projectOf(context) && ', ''],
  [AD, 'if (isCustomRole(policyId) && !chain.includes(roleParentOfName(policyId))) throw', 'if (false) throw'],
  [AD, "if (parent !== projectOf(context)) throw fail('uppie.adapter.gcp.shared_role'", "if (false) throw fail('uppie.adapter.gcp.shared_role'"],
  [AD, 'if (!isCustomRole(snapshot.name)) throw fail', 'if (false) throw fail'],
  [AD, 'if (!ROLE_ID.test(roleId)) throw', 'if (false) throw'],
  [AD, 'assertGrantable(document, await chainOf(client, projectOf(context)));', ''],
  [AD, 'if (codeOf(e) !== GRPC.ALREADY_EXISTS) throw e;', 'if (false) throw e;'],
  [AD, 'if (roleParentOf(document.resource, chain) !== roleParentOfName(policyId)) throw', 'if (false) throw'],
  [M, 'if (!role || role.deleted) continue;', 'if (!role) continue;'],
  [M, 'g.unconditional = g.unconditional || !b.condition;', 'g.unconditional = !b.condition;'],
  [M, "if (found.results.some((r) => r.access === 'NOT_GRANTED')) return 'DENIED';", "if (false) return 'DENIED';"],
  [M, "(r.access === 'NOT_GRANTED' ? allowed : unchanged)", '(true ? allowed : unchanged)'],
  [M, 'sameMember(r.subject.id, deny.subject.id)', 'true'],
  [M, 'allow.action.operations.some((p) => deny.action.operations.includes(p))', 'true'],
  [M, 'all.some(isBroad)', 'false'],
  [M, "decided === 0 ? 'LOW' : skipped === 0 ? 'HIGH' : 'MEDIUM'", "'HIGH'"],
  [M, 'chain.slice(chain.indexOf(target))', 'chain'],
  [D, 'if (!role.deleted) out.push', 'out.push'],
];
let survived = 0;
for (const [file, from, to] of mutations) {
  const p = root + file;
  const original = fs.readFileSync(p, 'utf8');
  if (!original.includes(from)) { console.log('ANCHOR MISSING', file, from); continue; }
  fs.writeFileSync(p, original.replace(from, to));
  let out = '';
  try { out = execSync('node scratch\\run_qualification_gates.js', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { out = String(e.stdout || ''); }
  fs.writeFileSync(p, original);
  const line = out.split(/\r?\n/).find((l) => l.includes('QUALIFICATION RESULTS')) || 'NO RESULT';
  const caught = !/\(0 failed\)/.test(line);
  if (!caught) survived++;
  console.log((caught ? 'caught   ' : 'SURVIVED ') + from.slice(0, 70).padEnd(72) + '=> ' + line.replace('QUALIFICATION RESULTS: ', ''));
}
console.log('survivors:', survived, 'of', mutations.length);
