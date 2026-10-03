// Repairs i18n imports whose relative path does not resolve to server/shared/i18n.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const target = path.join(root, 'server', 'shared', 'i18n');
const files = fs.readFileSync(path.join(__dirname, 'bad_i18n_imports.txt'), 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/)
  .map((l) => l.split(' -> ')[0].trim()).filter(Boolean);
let fixed = 0;
for (const rel of files) {
  const file = path.join(root, rel);
  let text = fs.readFileSync(file, 'utf8');
  let want = path.relative(path.dirname(file), target).replace(/\\/g, '/');
  if (!want.startsWith('.')) want = './' + want;
  const next = text.replace(/(from\s+')(\.[^']*shared\/i18n|\.\/i18n)(')/, (m, a, b, c) => a + want + c);
  if (next !== text) { fs.writeFileSync(file, next, 'utf8'); fixed++; console.log('fixed', rel, '->', want); }
}
console.log('fixed', fixed, 'of', files.length);
