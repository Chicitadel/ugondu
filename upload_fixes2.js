const { Client } = require('ssh2');

const filesToUpload = [
    {
        local: 'D:/ujomor-platform/platform-core/license.airroofers.eu/public_html/Mandatag/Api/PublicApi/LicenseVerifyController.php',
        remote: '/home/ujomorco/domains/platform-core/license.airroofers.eu/public_html/Mandatag/Api/PublicApi/LicenseVerifyController.php'
    },
    {
        local: 'D:/ujomor-platform/platform-core/license.airroofers.eu/public_html/Mandatag/AdminUi/pages/public/partials/verify_authenticated.php',
        remote: '/home/ujomorco/domains/platform-core/license.airroofers.eu/public_html/Mandatag/AdminUi/pages/public/partials/verify_authenticated.php'
    },
    {
        local: 'D:/ujomor-platform/platform-core/license.airroofers.eu/public_html/Mandatag/AdminUi/pages/public/partials/verify_scripts_1.php',
        remote: '/home/ujomorco/domains/platform-core/license.airroofers.eu/public_html/Mandatag/AdminUi/pages/public/partials/verify_scripts_1.php'
    },
    {
        local: 'D:/ujomor-platform/platform-core/identity.airroofers.eu/src/API/IdentityController.php',
        remote: '/home/ujomorco/domains/platform-core/identity.airroofers.eu/public_html/src/API/IdentityController.php'
    }
];

const conn = new Client();
conn.on('ready', () => {
    console.log('Connected to DirectAdmin server.');
    conn.sftp((err, sftp) => {
        if (err) {
            console.error(err);
            return conn.end();
        }
        
        let index = 0;
        const uploadNext = () => {
            if (index >= filesToUpload.length) {
                console.log('All files uploaded successfully!');
                conn.end();
                return;
            }
            const file = filesToUpload[index];
            console.log(`Uploading ${file.local} to ${file.remote}...`);
            sftp.fastPut(file.local, file.remote, (err) => {
                if (err) {
                    console.error('Failed to upload', file.local, err);
                } else {
                    console.log(`Successfully uploaded to ${file.remote}`);
                }
                index++;
                uploadNext();
            });
        };
        uploadNext();
    });
}).connect({ host: '162.244.94.48', port: 22, username: 'ujomorco', password: 'm0qqGV9;S-28Eq' });
