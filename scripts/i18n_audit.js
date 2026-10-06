const fs = require('fs');
const path = require('path');

const root = process.env.UGONDU_ROOT || path.resolve(__dirname, '..');
const localeDir = path.join(root, 'server', 'shared', 'locales');

const flat = (o, p = '', out = {}) => {
  for (const [k, v] of Object.entries(o)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, p + k + '.', out);
    else out[p + k] = String(v);
  }
  return out;
};

const locales = {};
for (const f of fs.readdirSync(localeDir).filter(f => f.endsWith('.json'))) {
  locales[path.basename(f, '.json')] = flat(JSON.parse(fs.readFileSync(path.join(localeDir, f), 'utf8')));
}
const en = locales.en;

const rep = [];
rep.push('LOCALES: ' + Object.entries(locales).map(([k, v]) => `${k}=${Object.keys(v).length}`).join(' '));

// Key-set parity
for (const [lang, d] of Object.entries(locales)) {
  if (lang === 'en') continue;
  const missing = Object.keys(en).filter(k => !(k in d));
  const extra = Object.keys(d).filter(k => !(k in en));
  const identical = Object.keys(en).filter(k => k in d && d[k] === en[k] && /[a-z]{4,}/i.test(en[k]));
  rep.push(`${lang}: missing=${missing.length} extra=${extra.length} untranslated(identical to en)=${identical.length}`);
}

// Template syntax
const dollar = Object.entries(en).filter(([, v]) => v.includes('${'));
rep.push(`\nTemplates using unsupported \${...} syntax: ${dollar.length}`);

// Source scan
const used = [];
const skip = new Set(['node_modules', 'dist', '.git', 'scratch']);
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!skip.has(e.name)) walk(p); }
    else if (/\.(ts|js)$/.test(e.name) && !e.name.endsWith('.d.ts')) {
      const src = fs.readFileSync(p, 'utf8');
      const re = /\b(?:__t|t)\(\s*(['"`])([^'"`]+)\1\s*(?:,\s*(\{[^}]*\}))?/g;
      let m;
      while ((m = re.exec(src))) {
        if (!/^[a-z_]+(\.[A-Za-z0-9_]+)+$|^[a-z_][a-z0-9_]*$/.test(m[2])) continue;
        const line = src.slice(0, m.index).split('\n').length;
        used.push({ file: path.relative(root, p), line, key: m[2], params: m[3] || '' });
      }
    }
  }
})(path.join(root));

const missingKeys = used.filter(u => !(u.key in en) && u.key.includes('.'));
rep.push(`\nTokens used in code: ${used.length}; dotted tokens missing from en: ${missingKeys.length}`);
missingKeys.slice(0, 25).forEach(u => rep.push(`  ${u.file}:${u.line} ${u.key}`));

// Param consistency (only calls with object literal params)
let paramIssues = 0;
const issues = [];
for (const u of used) {
  const tpl = en[u.key];
  if (!tpl || !u.params) continue;
  const body = u.params.replace(/^\{|\}$/g, '');
  const keys = body.split(',').map(s => s.trim()).filter(Boolean).map(s => (s.match(/^['"]?([A-Za-z0-9_]+)['"]?\s*(?::|$)/) || [])[1]).filter(Boolean);
  const holders = [...tpl.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
  const bad = holders.filter(h => !keys.includes(h));
  if (bad.length) { paramIssues++; issues.push(`  ${u.file}:${u.line} ${u.key} needs {${bad.join(',')}} got [${keys.join(',')}]`); }
}
rep.push(`\nParam/placeholder mismatches: ${paramIssues}`);
issues.slice(0, 20).forEach(i => rep.push(i));

fs.writeFileSync(path.join(root, 'scratch', 'i18n_audit.log'), rep.join('\n'));
console.log(rep.join('\n'));
