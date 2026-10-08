const fs = require('fs');
const path = require('path');
const root = process.cwd();
const enPath = path.join(root, 'server', 'shared', 'locales', 'en.json');
let en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

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
        used.push(m[2]);
      }
    }
  }
})(path.join(root));

const setKey = (obj, p, value) => {
    const parts = p.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]]) cur[parts[i]] = {};
        cur = cur[parts[i]];
    }
    if (!cur[parts[parts.length - 1]]) {
        cur[parts[parts.length - 1]] = value;
    }
};

let added = 0;
for (const key of used) {
    const keys = key.split('.');
    let cur = en;
    let found = true;
    for(const k of keys) {
        if (cur[k] === undefined) { found = false; break; }
        cur = cur[k];
    }
    if (!found) {
        setKey(en, key, key.split('.').pop().replace(/_/g, ' '));
        added++;
    }
}
console.log('Added ' + added + ' keys');
fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n', 'utf8');
