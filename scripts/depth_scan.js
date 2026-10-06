// Depth scan: finds code that reports success without doing the work.
const fs = require('fs');
const path = require('path');
const roots = ['server', 'client', 'packages'].map((r) => path.join(__dirname, '..', r));
const SKIP = /node_modules|[\\/]dist[\\/]|\.d\.ts$|[\\/]locales[\\/]/;
const SIGNALS = [
  ['comment-deferral', /\/\/\s*(Abstract|e\.g\.|Trigger specific|In production|In a real|would |simplified|for now|placeholder|stub|PENDING|FIXME|stub|dummy)/i],
  ['console-only-body', /console\.log\(__t\(/],
  ['literal-status', /return\s*\{\s*status:\s*'(provisioned|terminated|backup_complete|success|ok|OK|completed)'/],
  ['empty-async', /async\s+\w+\([^)]*\)\s*(:\s*Promise<[^>]*>)?\s*\{\s*\}/],
  ['tautology', /expect\((\[[^\]]*\]|'[^']*'|\d+(\.\d+)?|true|false)\)\.(toContain|toBe|toBeGreaterThan|toBeGreaterThanOrEqual)/],
];
const hits = {};
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (SKIP.test(p)) continue;
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx|js)$/.test(e.name) && !p.includes('scratch')) {
      const text = fs.readFileSync(p, 'utf8').split(/\r?\n/);
      text.forEach((line, i) => {
        for (const [name, re] of SIGNALS) if (re.test(line)) (hits[path.relative(path.join(__dirname, '..'), p)] ||= []).push(`${name}@${i + 1}`);
      });
    }
  }
}
roots.forEach((r) => fs.existsSync(r) && walk(r));
const rows = Object.entries(hits).sort((a, b) => b[1].length - a[1].length);
const out = rows.map(([f, h]) => `${String(h.length).padStart(3)}  ${f}  ${[...new Set(h.map((x) => x.split('@')[0]))].join(',')}`);
out.push(`FILES ${rows.length}  HITS ${rows.reduce((n, [, h]) => n + h.length, 0)}`);
fs.writeFileSync(path.join(__dirname, 'depth_scan.txt'), out.join('\n'));
console.log('depth scan done', rows.length);
