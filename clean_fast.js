const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('rm -rf /home/ujomorco/.cache /home/ujomorco/.npm /home/ujomorco/tmp/* /home/ujomorco/.trash/* /home/ujomorco/Maildir/new/* /home/ujomorco/Maildir/cur/* /home/ujomorco/.php/sessions/*', (err, stream) => {
        if(err) throw err;
        stream.on('close', () => {
            console.log('Cleanup fast done');
            conn.end();
        }).on('data', (data) => {
            console.log(data.toString());
        }).stderr.on('data', (data) => {
            console.error(data.toString());
        });
    });
}).connect({ host: '162.244.94.48', port: 22, username: 'ujomorco', password: 'm0qqGV9;S-28Eq' });
