const fs = require('fs');
const path = require('path');
const dir = 'D:\\ujomor-platform\\products\\ugondu\\server\\shared\\locales';

// ${expr} -> {expr with non-word chars replaced by '_'}; matches the param keys used at __t() call sites.
const convert = (s) => s.replace(/\$\{([^}]+)\}/g, (_, expr) => `{${expr.trim().replace(/[^A-Za-z0-9_]/g, '_')}}`);
const walk = (o) => {
  for (const k of Object.keys(o)) {
    if (o[k] && typeof o[k] === 'object') walk(o[k]);
    else if (typeof o[k] === 'string') o[k] = convert(o[k]);
  }
};

let total = 0;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
  const p = path.join(dir, f);
  const raw = fs.readFileSync(p, 'utf8');
  const before = (raw.match(/\$\{/g) || []).length;
  const obj = JSON.parse(raw);
  walk(obj);
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  total += before;
  console.log(`${f}: converted ${before} placeholders`);
}
console.log('total', total);
