'use strict';

const fs = require('fs');
const path = require('path');

const ROOT =
    process.env.UGONDU_ROOT ||
    path.resolve(__dirname, '..');

const LOCALES_DIR =
    path.join(ROOT, 'server', 'shared', 'locales');

if (!fs.existsSync(LOCALES_DIR)) {
    throw new Error('LOCALES_DIRECTORY_NOT_FOUND');
}

const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));

for (const file of files) {
    const fullPath = path.join(LOCALES_DIR, file);
    try {
        JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (e) {
        throw new Error('COR BLOCKED: Corrupt locale file ' + file + ' - ' + e.message);
    }
}
console.log('Locales updated successfully');
