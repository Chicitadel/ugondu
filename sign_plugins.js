const { generateKeyPairSync, sign } = require('crypto');
const fs = require('fs');
const path = require('path');

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const PLUGINS_DIR = path.resolve(__dirname, 'plugins');

for (const plugin of fs.readdirSync(PLUGINS_DIR)) {
    const pluginPath = path.join(PLUGINS_DIR, plugin);
    const indexJsPath = path.join(pluginPath, 'index.js');
    const manifestPath = path.join(pluginPath, 'manifest.json');
    if (fs.existsSync(indexJsPath) && fs.existsSync(manifestPath)) {
        const content = fs.readFileSync(indexJsPath);
        const signature = sign(null, content, privateKey).toString('base64');
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        manifest.signature = signature;
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    }
}
const pubPem = publicKey.export({ type: 'spki', format: 'pem' });
fs.writeFileSync('plugin_pub.pem', pubPem);
console.log('Plugins signed');
