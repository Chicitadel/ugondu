const fs = require('fs');
const files = [
    'D:/ujomor-platform/products/ugondu/server/engine-core/physical-certification.ts',
    'D:/ujomor-platform/products/ugondu/server/engine-core/physical-fargate-certification.ts'
];

for (const file of files) {
    let text = fs.readFileSync(file, 'utf8');
    text = text.replace(/,\s*\{\s*(count|id|txId|error):\s*([^,]+),\s*default:\s*['`].*?['`]\s*(?:\+\s*[^}]+)?\}/g, ', { $1: $2 }');
    text = text.replace(/,\s*\{\s*default:\s*['`].*?['`]\s*(?:\+\s*[^}]+)?\}/g, '');
    fs.writeFileSync(file, text);
}
console.log('Stripped');
