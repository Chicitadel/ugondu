const https = require('https');

const host = 'ny210.whpservers.com';
const port = 2222;
const user = 'ujomorco';
const pass = 'm0qqGV9;S-28Eq';

const auth = Buffer.from(user + ':' + pass).toString('base64');
const path = '/domains/jemaquille.com/public_html/.htaccess';

const options = {
  hostname: host,
  port: port,
  path: '/CMD_API_FILE_MANAGER?action=readFile&path=' + encodeURIComponent(path),
  method: 'GET',
  headers: {
    'Authorization': 'Basic ' + auth
  },
  rejectUnauthorized: false // In case the SSL cert is self-signed or mismatch
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('STATUS:', res.statusCode);
    console.log('BODY:', data);
  });
});

req.on('error', (e) => {
  console.error('ERROR:', e);
});

req.end();
