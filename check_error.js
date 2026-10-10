const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('tail -n 20 ~/domains/hub.airroofers.eu/logs/error.log || tail -n 20 /var/log/httpd/domains/hub.airroofers.eu.error.log', (err, stream) => {
        stream.on('close', () => conn.end()).on('data', (d) => process.stdout.write(d.toString())).stderr.on('data', (d) => process.stderr.write(d.toString()));
    });
}).connect({ host: '162.244.94.48', port: 22, username: 'ujomorco', password: 'm0qqGV9;S-28Eq' });
