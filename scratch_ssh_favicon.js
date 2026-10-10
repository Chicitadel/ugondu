const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('cat ~/domains/jemaquille.com/public_html/index.html | grep -i "icon"', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end()).on('data', (data) => console.log('STDOUT: ' + data));
  });
}).connect({ host: '162.244.94.48', port: 22, username: 'ujomorco', password: 'm0qqGV9;S-28Eq' });
