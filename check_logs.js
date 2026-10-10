const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('tail -n 50 /var/log/httpd/domains/license.airroofers.eu.error.log', (err, stream) => {
        if(err) throw err;
        stream.on('close', () => {
            conn.end();
        }).on('data', (data) => {
            console.log("LICENSE ERROR LOG:\n" + data.toString());
        }).stderr.on('data', (data) => {
            console.error(data.toString());
        });
    });
}).connect({ host: '162.244.94.48', port: 22, username: 'ujomorco', password: 'm0qqGV9;S-28Eq' });
