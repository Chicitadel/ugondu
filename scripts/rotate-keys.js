/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tooling / Cryptography / Authority Rotation
 * File           : rotate-keys.js
 * Version        : 3.0.0
 * Author         : Cryptographic Security Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-30
 * Last Modified  : 2026-09-30
 * Classification : ENTERPRISE | INTERNAL
 *
 * Governance:
 * - Enterprise Security Architecture
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Standards:
 * - ISO 27001
 * - SOC 2
 * - OWASP ASVS 5.0
 * - NIST SP 800-53
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

'use strict';

const { generateKeyPairSync, sign, createPrivateKey, createPublicKey, createHash } = require('crypto');
const fs = require('fs');
const path = require('path');
const canonicalize = (mod => mod && mod.default ? mod.default : mod)(require('canonicalize'));

const ROOT = path.resolve(__dirname, '..');
const SHARED_KEYS_DIR = path.join(ROOT, 'server/shared/keys');
const PACKS_DIR = path.join(ROOT, 'packs');
const PLUGINS_DIR = path.join(ROOT, 'plugins');

if (!fs.existsSync(SHARED_KEYS_DIR)) {
    fs.mkdirSync(SHARED_KEYS_DIR, { recursive: true });
}

console.log('[en] Starting Cryptographic Authority Rotation (P3.1)...');

// Generate 5 fresh v2 Ed25519 keypairs in-memory
const authorities = ['service_identity', 'recipe', 'langpack', 'evidence', 'plugin'];
const generatedKeys = {};

for (const auth of authorities) {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const pubPem = publicKey.export({ type: 'spki', format: 'pem' }).toString().trim();
    const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString().trim();
    generatedKeys[auth] = { pubPem, privPem, privateKey, publicKey };

    // Write public key to server/shared/keys
    const pubPath = path.join(SHARED_KEYS_DIR, `${auth}_public.pem`);
    fs.writeFileSync(pubPath, pubPem + '\n', 'utf8');
    console.log(`[en] Provisioned v2 public key: ${auth}_public.pem`);
}

// Synchronize plugin public keys
const pluginPubPem = generatedKeys['plugin'].pubPem;
fs.writeFileSync(path.join(ROOT, 'plugin_pub.pem'), pluginPubPem + '\n', 'utf8');
const pmPubPath = path.join(ROOT, 'server/plugin-manager/plugin_pub.pem');
if (fs.existsSync(path.dirname(pmPubPath))) {
    fs.writeFileSync(pmPubPath, pluginPubPem + '\n', 'utf8');
}

// Synchronize recipe public key for engine-core
const engineCoreKeysDir = path.join(ROOT, 'server/engine-core/keys');
if (!fs.existsSync(engineCoreKeysDir)) {
    fs.mkdirSync(engineCoreKeysDir, { recursive: true });
}
fs.writeFileSync(path.join(engineCoreKeysDir, 'ed25519_public.pem'), generatedKeys['recipe'].pubPem + '\n', 'utf8');
fs.writeFileSync(path.join(engineCoreKeysDir, 'key_id.txt'), 'key_recipe_v2\n', 'utf8');

// Re-sign all language packs with v2 langpack private key
const langPrivKey = generatedKeys['langpack'].privateKey;
if (fs.existsSync(PACKS_DIR)) {
    for (const file of fs.readdirSync(PACKS_DIR)) {
        if (!file.endsWith('.upl.json')) continue;
        const packPath = path.join(PACKS_DIR, file);
        const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));

        // Compute artifact digest over tokens
        const tokensCanonical = canonicalize(pack.tokens || {}) || JSON.stringify(pack.tokens || {});
        pack.artifactDigest = 'sha256:' + createHash('sha256').update(tokensCanonical).digest('hex');

        // Compute canonical manifest payload
        const canonicalManifest = {
            artifactDigest: pack.artifactDigest,
            direction: pack.direction || 'ltr',
            fallbackLocale: pack.fallbackLocale || 'en-US',
            language: pack.language || '',
            locale: pack.locale || '',
            maxCoreVersion: pack.maxCoreVersion || '',
            minCoreVersion: pack.minCoreVersion || '',
            packId: pack.packId || '',
            platformVersion: pack.platformVersion || '',
            publisher: pack.publisher || '',
            region: pack.region || '',
            schemaVersion: pack.schemaVersion || '1',
            version: pack.version || ''
        };
        const payload = canonicalize(canonicalManifest) || JSON.stringify(canonicalManifest);
        pack.signature = sign(null, Buffer.from(payload, 'utf8'), langPrivKey).toString('base64');

        fs.writeFileSync(packPath, JSON.stringify(pack, null, 2) + '\n', 'utf8');
        console.log(`[en] Re-signed language pack with v2 key: ${file}`);
    }
}

// Re-sign all plugins with v2 plugin private key
const pluginPrivKey = generatedKeys['plugin'].privateKey;
if (fs.existsSync(PLUGINS_DIR)) {
    for (const plugin of fs.readdirSync(PLUGINS_DIR)) {
        const pluginPath = path.join(PLUGINS_DIR, plugin);
        if (!fs.statSync(pluginPath).isDirectory()) continue;
        const indexJsPath = path.join(pluginPath, 'index.js');
        const manifestPath = path.join(pluginPath, 'manifest.json');
        if (fs.existsSync(indexJsPath) && fs.existsSync(manifestPath)) {
            const content = fs.readFileSync(indexJsPath);
            const signature = sign(null, content, pluginPrivKey).toString('base64');
            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            manifest.signature = signature;
            fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
            console.log(`[en] Re-signed plugin with v2 key: ${manifest.name}`);
        }
    }
}

// Write local untracked .env file for development and local test execution
// Note: .env is in .gitignore and rejected from Git tracking
const envContent = [
    `# Local Cryptographic Authority Private Keys (Gitignored / Ephemeral)`,
    `UGONDU_SERVICE_IDENTITY_PRIVATE_KEY="${generatedKeys['service_identity'].privPem.replace(/\n/g, '\\n')}"`,
    `UGONDU_RECIPE_PRIVATE_KEY="${generatedKeys['recipe'].privPem.replace(/\n/g, '\\n')}"`,
    `UGONDU_LANGPACK_PRIVATE_KEY="${generatedKeys['langpack'].privPem.replace(/\n/g, '\\n')}"`,
    `UGONDU_EVIDENCE_PRIVATE_KEY="${generatedKeys['evidence'].privPem.replace(/\n/g, '\\n')}"`,
    `UGONDU_PLUGIN_PRIVATE_KEY="${generatedKeys['plugin'].privPem.replace(/\n/g, '\\n')}"`
].join('\n') + '\n';

fs.writeFileSync(path.join(ROOT, '.env'), envContent, 'utf8');
console.log('[en] Local environment secrets written to .env (gitignored).');
console.log('[en] Cryptographic Authority Rotation complete.');
