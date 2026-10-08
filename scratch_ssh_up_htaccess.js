const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('ls -la /home/ujomorco/.htaccess /home/ujomorco/domains/.htaccess', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: '162.244.94.48',
  port: 22,
  username: 'ujomorco',
  password: 'm0qqGV9;S-28Eq'
});
