const { Client } = require('ssh2');

const filesToUpload = [
    {
        local: 'D:/ujomor-platform/platform-core/license.airroofers.eu/public_html/Mandatag/AdminUi/pages/mfa/mfa_verify.php',
        remote: '/home/ujomorco/domains/platform-core/license.airroofers.eu/public_html/Mandatag/AdminUi/pages/mfa/mfa_verify.php'
    },
    {
        local: 'D:/ujomor-platform/platform-core/license.airroofers.eu/public_html/Mandatag/AdminUi/pages/webauth/webauth_verify.php',
        remote: '/home/ujomorco/domains/platform-core/license.airroofers.eu/public_html/Mandatag/AdminUi/pages/webauth/webauth_verify.php'
    }
];

const conn = new Client();
conn.on('ready', () => {
    console.log('Connected to DirectAdmin server.');
    conn.sftp((err, sftp) => {
        if (err) return conn.end();
        let index = 0;
        const uploadNext = () => {
            if (index >= filesToUpload.length) {
                console.log('All files uploaded successfully!');
                conn.end();
                return;
            }
            const file = filesToUpload[index];
            sftp.fastPut(file.local, file.remote, (err) => {
                if (err) console.error('Failed to upload', file.local, err);
                else console.log(`Successfully uploaded to ${file.remote}`);
                index++;
                uploadNext();
            });
        };
        uploadNext();
    });
}).connect({ host: '162.244.94.48', port: 22, username: 'ujomorco', password: 'm0qqGV9;S-28Eq' });
