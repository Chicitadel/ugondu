const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
    console.log('Connected to DirectAdmin server.');
    conn.sftp((err, sftp) => { 
        if(err) { console.error(err); return conn.end(); }
        console.log('Uploading airroofers.eu.zip...');
        sftp.fastPut('D:/ujomor-platform/airroofers.eu/airroofers.eu.zip', '/home/ujomorco/airroofers.eu.zip', (err) => { 
            if(err) { console.error('Upload failed', err); return conn.end(); }
            console.log('Upload complete. Extracting to domains...');
            conn.exec('mkdir -p ~/domains/ai.airroofers.eu/public_html && mkdir -p ~/domains/hub.airroofers.eu/current/public_html && unzip -o -q ~/airroofers.eu.zip -d ~/domains/ai.airroofers.eu/public_html/ && unzip -o -q ~/airroofers.eu.zip -d ~/domains/hub.airroofers.eu/current/public_html/ && echo DEPLOY_SUCCESSFUL', (err, stream) => { 
                stream.on('close', () => { console.log('Deployment closed.'); conn.end(); })
                      .on('data', (d) => process.stdout.write(d.toString())); 
            }); 
        }); 
    }); 
}).connect({ host: '162.244.94.48', port: 22, username: 'ujomorco', password: 'm0qqGV9;S-28Eq' });
