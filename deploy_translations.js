const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.sftp((err, sftp) => {
        if(err) throw err;
        
        let files = [
            ['D:/ujomor-platform/platform-core/license.airroofers.eu/public_html/Mandatag/AdminUi/Providers/WelcomeProvider.php', '/home/ujomorco/domains/license.airroofers.eu/public_html/Mandatag/AdminUi/Providers/WelcomeProvider.php'],
            ['D:/ujomor-platform/platform-core/license.airroofers.eu/public_html/Mandatag/AdminUi/Providers/ExecutiveProvider.php', '/home/ujomorco/domains/license.airroofers.eu/public_html/Mandatag/AdminUi/Providers/ExecutiveProvider.php']
        ];
        
        let done = 0;
        for (let i = 0; i < files.length; i++) {
            sftp.fastPut(files[i][0], files[i][1], (err) => {
                if(err) console.error("Error uploading " + files[i][1], err);
                done++;
                if (done === files.length) {
                    console.log("Deployed PHP translations.");
                    conn.end();
                }
            });
        }
    });
}).connect({ host: '162.244.94.48', port: 22, username: 'ujomorco', password: 'm0qqGV9;S-28Eq' });
