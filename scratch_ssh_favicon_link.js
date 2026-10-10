const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  const cmd = 'cd ~/domains/jemaquille.com/public_html && cp index.html index.html.bak && sed -i "s,</head>,<link rel=\"icon\" href=\"/favicon.ico\" type=\"image/x-icon\">\\n</head>,gi" index.html && grep -i favicon index.html';
  conn.exec(cmd, (err, stream) => {
    stream.on('close', () => conn.end()).on('data', (data) => console.log('STDOUT: ' + data)).stderr.on('data', (data) => console.log('STDERR: ' + data));
  });
}).connect({ host: '162.244.94.48', port: 22, username: 'ujomorco', password: 'm0qqGV9;S-28Eq' });