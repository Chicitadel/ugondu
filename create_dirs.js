const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.exec('mkdir -p /home/ujomorco/domains/license.airroofers.eu/public_html/Mandatag/AdminUi/pages/partials /home/ujomorco/domains/license.airroofers.eu/public_html/Mandatag/AdminUi/pages/public/partials /home/ujomorco/domains/license.airroofers.eu/public_html/Mandatag/Notifications/catalog /home/ujomorco/domains/license.airroofers.eu/public_html/Mandatag/Services/Email /home/ujomorco/domains/license.airroofers.eu/public_html/Mandatag/lang /home/ujomorco/domains/license.airroofers.eu/public_html/Mandatag/scratch /home/ujomorco/domains/license.airroofers.eu/public_html/scratch', (err, stream) => {
        if(err) throw err;
        stream.on('close', () => {
            console.log('Directories created.');
            conn.end();
        }).on('data', (data) => {
            console.log(data.toString());
        }).stderr.on('data', (data) => {
            console.error(data.toString());
        });
    });
}).connect({ host: '162.244.94.48', port: 22, username: 'ujomorco', password: 'm0qqGV9;S-28Eq' });
