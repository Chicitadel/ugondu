const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    console.log('Connected to DirectAdmin server for Deployment Fix.');
    conn.sftp((err, sftp) => {
        if(err) { console.error(err); return conn.end(); }
        console.log('Uploading repository zip...');
        sftp.fastPut('D:/ujomor-platform/airroofers.eu/airroofers.eu.zip', '/home/ujomorco/airroofers_fix.zip', (err) => {
            if(err) { console.error('Upload failed', err); return conn.end(); }
            console.log('Upload complete. Executing correct extraction paths...');
            const script = `
                set -e
                echo "--> Fixing ai.airroofers.eu"
                cd ~/domains/ai.airroofers.eu
                unzip -o -q ~/airroofers_fix.zip
                find . -type d -exec chmod 755 {} \\;
                find . -type f -exec chmod 644 {} \\;

                echo "--> Fixing hub.airroofers.eu"
                cd ~/domains/hub.airroofers.eu
                TIMESTAMP=\$(date +%Y%m%d_%H%M%S)
                mkdir -p releases/release_\$TIMESTAMP
                unzip -o -q ~/airroofers_fix.zip -d releases/release_\$TIMESTAMP
                find releases/release_\$TIMESTAMP -type d -exec chmod 755 {} \\;
                find releases/release_\$TIMESTAMP -type f -exec chmod 644 {} \\;
                rm -f current
                ln -s releases/release_\$TIMESTAMP current

                echo "--> Validating deployments locally on server"
                php -l ~/domains/ai.airroofers.eu/public_html/index.php
                php -l ~/domains/hub.airroofers.eu/current/public_html/index.php

                echo "DEPLOY_FIX_SUCCESSFUL"
            `;
            conn.exec(script, (err, stream) => {
                stream.on('close', () => { console.log('Session closed.'); conn.end(); })
                      .on('data', (d) => process.stdout.write(d.toString()))
                      .stderr.on('data', (d) => process.stderr.write(d.toString()));
            });
        });
    });
}).connect({ host: '162.244.94.48', port: 22, username: 'ujomorco', password: 'm0qqGV9;S-28Eq' });
