const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('convert ~/domains/jemaquille.com/public_html/jemaquille-logo.png -resize 32x32 ~/domains/jemaquille.com/public_html/favicon.ico', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('ls -la ~/domains/jemaquille.com/public_html/favicon.ico', (err2, stream2) => {
        stream2.on('close', () => conn.end()).on('data', (data) => console.log('STDOUT: ' + data));
      });
    }).on('data', (data) => console.log('STDOUT: ' + data));
  });
}).connect({ host: '162.244.94.48', port: 22, username: 'ujomorco', password: 'm0qqGV9;S-28Eq' });
