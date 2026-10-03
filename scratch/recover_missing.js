const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = 'D:\\ujomor-platform\\products\\ugondu';
const flat = (o, p = '', out = {}) => { for (const [k, v] of Object.entries(o)) { if (v && typeof v === 'object') flat(v, p + k + '.', out); else out[p + k] = String(v); } return out; };
const en = flat(JSON.parse(fs.readFileSync(path.join(root, 'server/shared/locales/en.json'), 'utf8')));

// Collect all __t('dotted.key' call sites whose key is not in en
const missing = {}; // key -> [{file,line,params}]
const skip = new Set(['node_modules', 'dist', '.git', 'scratch']);
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!skip.has(e.name)) walk(p); }
    else if (/\.(ts|js)$/.test(e.name) && !e.name.endsWith('.d.ts')) {
      const src = fs.readFileSync(p, 'utf8');
      const re = /\b__t\(\s*(['"`])([A-Za-z_]+(?:\.[A-Za-z0-9_]+)+)\1/g;
      let m;
      while ((m = re.exec(src))) {
        if (m[2] in en) continue;
        const line = src.slice(0, m.index).split('\n').length;
        (missing[m[2]] ||= []).push({ file: path.relative(root, p).replace(/\\/g, '/'), line });
      }
    }
  }
})(path.join(root, 'server'));

// Recover originals from git: pair removed/added lines in each hunk
const recovered = {};
const unresolved = [];
const files = [...new Set(Object.values(missing).flat().map(s => s.file))];
for (const f of files) {
  let diff = '';
  try { diff = execFileSync('git', ['-C', root, 'diff', '-U0', 'HEAD', '--', f], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); } catch { continue; }
  const hunks = diff.split(/^@@.*$/m).slice(1);
  for (const h of hunks) {
    const removed = h.split(/\r?\n/).filter(l => l.startsWith('-')).map(l => l.slice(1));
    const added = h.split(/\r?\n/).filter(l => l.startsWith('+')).map(l => l.slice(1));
    for (const a of added) {
      const km = [...a.matchAll(/__t\(\s*['"`]([A-Za-z_]+(?:\.[A-Za-z0-9_]+)+)['"`]/g)];
      for (const k of km) {
        const key = k[1];
        if (!(key in missing) || recovered[key]) continue;
        // find a string literal in removed lines whose slug matches the key tail
        const tail = key.split('.').pop();
        for (const r of removed) {
          const lits = [...r.matchAll(/(`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/g)].map(x => x[1]);
          for (const lit of lits) {
            const body = lit.slice(1, -1);
            const slug = body.replace(/\$\{[^}]*\}/g, ' ').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
            if (slug.length > 3 && (tail.startsWith(slug.slice(0, Math.min(slug.length, 30))) || slug.startsWith(tail.slice(0, 20)))) {
              recovered[key] = body; break;
            }
          }
          if (recovered[key]) break;
        }
      }
    }
  }
}

const allKeys = Object.keys(missing);
for (const k of allKeys) if (!recovered[k]) unresolved.push(k);
const out = { total: allKeys.length, recovered: Object.keys(recovered).length, unresolved, recoveredMap: recovered, sites: missing };
fs.writeFileSync(path.join(root, 'scratch', 'missing_keys.json'), JSON.stringify(out, null, 2));
console.log(`missing=${allKeys.length} recovered=${Object.keys(recovered).length} unresolved=${unresolved.length}`);
for (const [k, v] of Object.entries(recovered).slice(0, 14)) console.log(k, '=>', v);
console.log('UNRESOLVED:'); unresolved.slice(0, 40).forEach(k => console.log(' ', k, missing[k][0].file + ':' + missing[k][0].line));
