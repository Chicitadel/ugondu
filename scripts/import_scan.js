// Verifies that every relative import/require in the source tree resolves to a real file.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const SKIP = /node_modules|[\\/]dist[\\/]|[\\/]scratch[\\/]|\.d\.ts$/;
const bad = [];
let checked = 0;
let ignored = 0;
function exists(base) {
  return ['.ts', '.tsx', '.js', '.json', '/index.ts', '/index.js', ''].some((ext) => {
    try { return fs.statSync(base + ext).isFile(); } catch { return false; }
  });
}
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (SKIP.test(p)) continue;
    if (e.isDirectory()) { walk(p); continue; }
    if (!/\.(ts|tsx)$/.test(e.name)) continue;
    const text = fs.readFileSync(p, 'utf8');
    ignored += (text.match(/@ts-ignore|@ts-nocheck/g) || []).length;
    const re = /(?:from\s+|import\s*\(\s*|require\s*\(\s*)'(\.{1,2}\/[^']*)'/g;
    let m;
    while ((m = re.exec(text))) {
      checked++;
      if (!exists(path.resolve(path.dirname(p), m[1]))) bad.push(`${path.relative(root, p)} -> ${m[1]}`);
    }
  }
}
['server', 'client', 'packages'].forEach((r) => fs.existsSync(path.join(root, r)) && walk(path.join(root, r)));
fs.writeFileSync(path.join(__dirname, 'import_scan.txt'), bad.join('\n') + `\nCHECKED ${checked} BROKEN ${bad.length} TS_IGNORE_DIRECTIVES ${ignored}\n`);
console.log('checked', checked, 'broken', bad.length, 'ts-ignore', ignored);
