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

let failed = false;
for (const file of files) {
    const fullPath = path.join(LOCALES_DIR, file);
    try {
        JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    } catch (e) {
        console.error('Invalid JSON in locale file: ' + file);
        failed = true;
    }
}

if (failed) {
    process.exit(1);
}
console.log('Locales validated successfully');
