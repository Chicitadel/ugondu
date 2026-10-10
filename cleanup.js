const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    const script = `
        echo "Cleaning up inodes..."
        rm -rf ~/airroofers.eu.zip ~/airroofers_fix.zip
        rm -rf ~/domains/ai.airroofers.eu/node_modules
        rm -rf ~/domains/hub.airroofers.eu/releases/*/node_modules
        rm -rf ~/domains/ai.airroofers.eu/public_html/node_modules
        echo "Check new quota:"
        quota -s
    `;
    conn.exec(script, (err, stream) => {
        stream.on('close', () => conn.end()).on('data', (d) => process.stdout.write(d.toString()));
    });
}).connect({ host: '162.244.94.48', port: 22, username: 'ujomorco', password: 'm0qqGV9;S-28Eq' });
