const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    console.log('SFTP ready');
    sftp.fastPut('D:\\\\ujomor-platform\\\rproducts\\\ugondu\\\platform-core-src.zip', '/home/ujomorco/platform-core-src.zip', (err) => {
      if (err) throw err;
      console.log('Uploaded platform-core-src.zip');
      sftp.fastPut('D:\\\\ujomor-platform\\\rproducts\\\ugondu\\\operations-src.zip', '/home/ujomorco/operations-src.zip', (err2) => {
        if (err2) throw err2;
        console.log('Uploaded operations-src.zip');
        const setupCmd = 'cd ~/domains/identity.airroofers.eu/current/public_html/vendor && mkdir -p airroofers/platform-core && mkdir -p airroofers/operations && unzip -o -q ~/platform-core-src.zip -d airroofers/platform-core/ && unzip -o -q ~/operations-src.zip -d airroofers/operations/ && rm ~/platform-core-src.zip ~/operations-src.zip && echo "Files extracted"';
        conn.exec(setupCmd, (err3, stream) => {
          if (err3) throw err3;
          stream.on('close', () => conn.end()).on('data', (s) => console.log('STDOUT: ' + s)).stderr.on('data', (s) => console.log('STDERR: ' + s));
        });
      });
    });
  });
}).connect({ host: '162.244.94.48', port: 22, username: 'ujomorco', password: 'm0qqGV9c;S-28Eq' });