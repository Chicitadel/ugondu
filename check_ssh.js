const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('ls -la ~/domains/license.airroofers.eu/public_html/Mandatag/Api/PublicApi/', (err, stream) => {
        if (err) throw err;
        stream.on('data', (data) => process.stdout.write(data.toString()));
        stream.on('close', () => conn.end());
    });
}).connect({ host: '162.244.94.48', port: 22, username: 'ujomorco', password: 'm0qqGV9;S-28Eq' });
