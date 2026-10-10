const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('rm -rf ~/domains/license.airroofers.eu/public_html/releases/release_*; rm -f ~/repository.zip; rm -f ~/react_hub.zip', (err, stream) => {
        stream.on('close', () => { console.log('Cleaned up disk space.'); conn.end(); })
              .on('data', (d) => process.stdout.write(d.toString()))
              .stderr.on('data', (d) => process.stderr.write(d.toString()));
    });
}).connect({ host: '162.244.94.48', port: 22, username: 'ujomorco', password: 'm0qqGV9;S-28Eq' });
