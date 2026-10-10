const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('find /home/ujomorco -type f | wc -l; ls -la /home/ujomorco/.trash; rm -rf /home/ujomorco/.trash/*; rm -rf /home/ujomorco/tmp/*; rm -rf /home/ujomorco/.php/sessions/*', (err, stream) => {
        if(err) throw err;
        stream.on('close', () => {
            conn.end();
        }).on('data', (data) => {
            console.log(data.toString());
        }).stderr.on('data', (data) => {
            console.error(data.toString());
        });
    });
}).connect({ host: '162.244.94.48', port: 22, username: 'ujomorco', password: 'm0qqGV9;S-28Eq' });
