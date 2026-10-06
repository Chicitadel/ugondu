const fs = require('fs');
const path = require('path');

const root = 'D:\\ujomor-platform\\products\\ugondu\\server';
const patterns = [
  /\/\/\s*IMPLEMENTATION:/,
  /NOT_IMPLEMENTED/,
  /\bPENDING\b/,
  /\bFIXME\b/,
  /not implemented/i,
  /void context;/,
  /\bstub\b/i,
  /\bstub\b/i,
  /\bplaceholder\b/i,
  /return \[\];\s*$/,
  /return \{\};\s*$/,
];

const hits = [];
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', 'tests', '.git'].includes(e.name)) continue;
      walk(p);
    } else if (e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts') && !e.name.endsWith('.d.ts')) {
      const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
      lines.forEach((l, i) => {
        for (const re of patterns) {
          if (re.test(l)) { hits.push({ file: path.relative(root, p), line: i + 1, text: l.trim(), pat: re.source }); break; }
        }
      });
    }
  }
}
walk(root);

const byFile = {};
for (const h of hits) (byFile[h.file] ||= []).push(h);
const out = [];
out.push(`TOTAL HITS: ${hits.length} in ${Object.keys(byFile).length} files`);
for (const [f, hs] of Object.entries(byFile).sort((a, b) => b[1].length - a[1].length)) {
  out.push(`\n${hs.length}\t${f}`);
  hs.slice(0, 6).forEach(h => out.push(`   L${h.line}: ${h.text.slice(0, 110)}`));
}
fs.writeFileSync('D:\\ujomor-platform\\products\\ugondu\\scratch\\stub_scan.log', out.join('\n'));
console.log(out.join('\n').slice(0, 9000));
