const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'server', 'shared', 'locales');
const sourceFile = 'en.json';

function flatten(obj, prefix = '') {
    let result = {};
    for (const key in obj) {
        const val = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (typeof val === 'object' && val !== null) {
            Object.assign(result, flatten(val, newKey));
        } else {
            result[newKey] = val;
        }
    }
    return result;
}

function getPlaceholders(str) {
    if (typeof str !== 'string') return [];
    const matches = str.match(/{{[^}]+}}/g) || [];
    return matches.sort();
}

function block(msg) {
    console.error(`COR BLOCKED: ${msg}`);
    process.exit(1);
}

const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
if (!files.includes(sourceFile)) {
    block('Source locale en.json missing');
}

const locales = {};
for (const file of files) {
    try {
        locales[file] = flatten(JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8')));
    } catch (e) {
        block(`Malformed JSON in ${file}`);
    }
}

const sourceKeys = locales[sourceFile];
const sourceKeyNames = Object.keys(sourceKeys);

for (const file of files) {
    if (file === sourceFile) continue;
    const targetKeys = locales[file];
    const targetKeyNames = Object.keys(targetKeys);

    const missing = sourceKeyNames.filter(k => !targetKeyNames.includes(k));
    if (missing.length > 0) block(`Missing keys in ${file}: ${missing.join(', ')}`);

    const extra = targetKeyNames.filter(k => !sourceKeyNames.includes(k));
    if (extra.length > 0) block(`Extra keys in ${file}: ${extra.join(', ')}`);

    for (const k of sourceKeyNames) {
        if (typeof targetKeys[k] !== 'string') block(`Malformed value for key ${k} in ${file}`);
        
        const sourceP = getPlaceholders(sourceKeys[k]);
        const targetP = getPlaceholders(targetKeys[k]);
        if (JSON.stringify(sourceP) !== JSON.stringify(targetP)) {
            block(`Placeholder mismatch for key ${k} in ${file}`);
        }
    }
}

console.log('Localization validation PASS');
