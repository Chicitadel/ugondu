const fs = require('fs');
const path = require('path');
const root = 'D:\\ujomor-platform\\products\\ugondu';
const flat = (o, p = '', out = {}) => { for (const [k, v] of Object.entries(o)) { if (v && typeof v === 'object') flat(v, p + k + '.', out); else out[p + k] = String(v); } return out; };
const en = flat(JSON.parse(fs.readFileSync(path.join(root, 'server/shared/locales/en.json'), 'utf8')));
const dollarKeys = Object.keys(en).filter(k => en[k].includes('${'));
const sites = {};
const skip = new Set(['node_modules', 'dist', '.git', 'scratch']);
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!skip.has(e.name)) walk(p); }
    else if (/\.ts$/.test(e.name) && !e.name.endsWith('.d.ts')) {
      const src = fs.readFileSync(p, 'utf8');
      for (const k of dollarKeys) {
        let i = -1;
        while ((i = src.indexOf("'" + k + "'", i + 1)) >= 0) {
          const line = src.slice(0, i).split('\n').length;
          const call = src.slice(i, i + 220).replace(/\s+/g, ' ');
          (sites[k] ||= []).push(`${path.relative(root, p)}:${line} ${call.slice(0, 170)}`);
        }
      }
    }
  }
})(path.join(root, 'server'));
const out = [];
for (const k of dollarKeys) {
  out.push(`KEY ${k}\n  TPL ${en[k]}`);
  (sites[k] || ['  (no call site found)']).forEach(s => out.push('  USE ' + s));
}
fs.writeFileSync(path.join(root, 'scratch', 'dollar_templates.log'), out.join('\n'));
console.log(out.length + ' lines; keys=' + dollarKeys.length + '; with no site=' + dollarKeys.filter(k => !sites[k]).length);
console.log(out.slice(0, 60).join('\n'));
