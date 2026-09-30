/******************************************************************************
 * Project        : Ugondu — Universal Deployment Intelligence Platform
 * Module         : Tooling / Cryptography
 * File           : sign_plugins.js
 * Version        : 2.0.0
 * Author         : Cryptographic Security Engineering Authority
 * Organization   : Air Roofers Ltd
 * Created Date   : 2026-09-29
 * Last Modified  : 2026-09-30
 * Classification : COMMERCIAL | INTERNAL
 *
 * Governance:
 * - Enterprise Security Architecture
 * - Security Reviewed
 * - Architecture Controlled
 * - Protocol Frozen
 *
 * Copyright (c) 2026 Air Roofers Ltd. All Rights Reserved.
 ******************************************************************************/

'use strict';

const { generateKeyPairSync, sign, createPrivateKey, createPublicKey } = require('crypto');
const fs = require('fs');
const path = require('path');

const SHARED_KEYS_DIR = path.resolve(__dirname, 'server/shared/keys');
const PRIV_KEY_PATH = path.join(SHARED_KEYS_DIR, 'plugin_private.pem');
const PUB_KEY_PATH = path.join(SHARED_KEYS_DIR, 'plugin_public.pem');
const PLUGINS_DIR = path.resolve(__dirname, 'plugins');

let privateKeyPem;
let publicKeyPem;

if (fs.existsSync(PRIV_KEY_PATH) && fs.existsSync(PUB_KEY_PATH)) {
    privateKeyPem = fs.readFileSync(PRIV_KEY_PATH, 'utf-8').trim();
    publicKeyPem = fs.readFileSync(PUB_KEY_PATH, 'utf-8').trim();
} else {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString().trim();
    publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString().trim();

    if (!fs.existsSync(SHARED_KEYS_DIR)) {
        fs.mkdirSync(SHARED_KEYS_DIR, { recursive: true });
    }
    fs.writeFileSync(PRIV_KEY_PATH, privateKeyPem + '\n');
    fs.writeFileSync(PUB_KEY_PATH, publicKeyPem + '\n');
}

const privateKey = createPrivateKey(privateKeyPem);

for (const plugin of fs.readdirSync(PLUGINS_DIR)) {
    const pluginPath = path.join(PLUGINS_DIR, plugin);
    if (!fs.statSync(pluginPath).isDirectory()) continue;

    const indexJsPath = path.join(pluginPath, 'index.js');
    const manifestPath = path.join(pluginPath, 'manifest.json');
    if (fs.existsSync(indexJsPath) && fs.existsSync(manifestPath)) {
        const content = fs.readFileSync(indexJsPath);
        const signature = sign(null, content, privateKey).toString('base64');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        manifest.signature = signature;
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
        console.log(`[en] Signed plugin: ${manifest.name}`);
    }
}

// Write public key to known discovery locations
fs.writeFileSync(path.resolve(__dirname, 'plugin_pub.pem'), publicKeyPem + '\n');
const pmPubPath = path.resolve(__dirname, 'server/plugin-manager/plugin_pub.pem');
if (fs.existsSync(path.dirname(pmPubPath))) {
    fs.writeFileSync(pmPubPath, publicKeyPem + '\n');
}

console.log('[en] Plugin signing complete and public keys synchronized.');
