const fs = require('fs');
const path = require('path');

const localeDirs = [
    path.join(__dirname, '..', 'server', 'shared', 'locales'),
    path.join(__dirname, '..', 'client', 'locales')
];
const sourceFile = 'en.json';

function block(msg) {
    console.error(`COR BLOCKED: ${msg}`);
    process.exit(1);
}

function parseJSON(file) {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
        block(`Malformed JSON in ${path.basename(file)}`);
    }
}

function mergeMissing(src, tgt, filePath) {
    let changed = false;
    const sortedTarget = {};
    const keys = Object.keys(src).sort();
    
    for (const k of keys) {
        if (typeof src[k] === 'object' && src[k] !== null) {
            if (!tgt[k] || typeof tgt[k] !== 'object') {
                tgt[k] = {};
                changed = true;
            }
            const res = mergeMissing(src[k], tgt[k], filePath);
            sortedTarget[k] = tgt[k];
            if (res) changed = true;
        } else {
            if (!(k in tgt)) {
                block(`Missing translation key '${k}' in ${filePath}. Cannot silently insert English source.`);
            } else {
                sortedTarget[k] = tgt[k]; // Keep existing, do not overwrite
            }
        }
    }
    
    // Remove extra keys to ensure deterministic output matching source schema
    for (const k in tgt) {
        if (!(k in src)) {
            changed = true;
        }
    }
    
    // Mutate original object to preserve reference
    for (const k in tgt) delete tgt[k];
    for (const k in sortedTarget) tgt[k] = sortedTarget[k];
    
    return changed;
}

for (const localesDir of localeDirs) {
    if (!fs.existsSync(localesDir)) continue;

    const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
    if (!files.includes(sourceFile)) {
        block(`Source locale en.json missing in ${localesDir}`);
    }

    const sourceObj = parseJSON(path.join(localesDir, sourceFile));

    for (const file of files) {
        if (file === sourceFile) continue;
        
        const filePath = path.join(localesDir, file);
        const targetObj = parseJSON(filePath);
        
        if (mergeMissing(sourceObj, targetObj, filePath)) {
            fs.writeFileSync(filePath, JSON.stringify(targetObj, null, 2) + '\n', 'utf8');
        }
    }
}

console.log('Locales updated successfully');
