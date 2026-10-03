const fs = require('fs');
const { execSync } = require('child_process');
const root = 'D:\\ujomor-platform\\products\\ugondu\\';
const mutations = [
  { file: 'server\\uppie\\src\\adapters\\azure-rbac\\AzureRbacHelpers.ts', from: "if (rule.effect !== 'ALLOW') throw", to: "if (false) throw" },
  { file: 'server\\uppie\\src\\adapters\\azure-rbac\\AzureRbacAdapter.ts', from: "existing.roleType === 'CustomRole' && grantsDigest(existing) !== grantsDigest(document)", to: 'false' },
  { file: 'server\\uppie\\src\\adapters\\azure-rbac\\AzureRbacModel.ts', from: 'sameId(a.roleDefinitionId, role.id)) seen.set', to: 'true) seen.set' },
  { file: 'server\\uppie\\src\\adapters\\azure-rbac\\AzureRbacHelpers.ts', from: "!(data ? p.notDataActions : p.notActions).some((n) => matches(n, name))", to: 'true' },
];
for (const m of mutations) {
  const p = root + m.file;
  const original = fs.readFileSync(p, 'utf8');
  if (!original.includes(m.from)) { console.log('ANCHOR MISSING', m.file, m.from); continue; }
  fs.writeFileSync(p, original.replace(m.from, m.to));
  let out = '';
  try { out = execSync('node scratch\\run_qualification_gates.js', { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { out = String(e.stdout || ''); }
  fs.writeFileSync(p, original);
  const line = out.split(/\r?\n/).find((l) => l.includes('QUALIFICATION RESULTS'));
  console.log(m.to.slice(0, 40).padEnd(42), '=>', line);
}
