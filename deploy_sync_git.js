const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const filesTxt = fs.readFileSync('sync_files.txt', 'utf8');
const files = filesTxt.trim().split('\n').map(f => f.trim()).filter(Boolean);

let uploads = [];
for (let file of files) {
    let localPath = '';
    let remotePath = '';
    
    if (file.startsWith('hub.')) {
        localPath = 'D:/ujomor-platform/platform-experience/' + file;
        remotePath = '/home/ujomorco/domains/' + file.replace('hub.airroofers.eu/dist', 'hub.airroofers.eu/public_html');
    } else {
        localPath = 'D:/ujomor-platform/platform-core/' + file;
        if (file.includes('public_html')) {
            remotePath = '/home/ujomorco/domains/' + file;
        } else {
            // insert public_html after domain
            const parts = file.split('/');
            const domain = parts[0];
            const rest = parts.slice(1).join('/');
            remotePath = '/home/ujomorco/domains/' + domain + '/public_html/' + rest;
        }
    }
    
    if(fs.existsSync(localPath)) {
        uploads.push({ local: localPath, remote: remotePath });
    }
}

console.log("Preparing to upload " + uploads.length + " files.");

const conn = new Client();
conn.on('ready', () => {
    console.log('Connected to DirectAdmin via SSH');
    conn.sftp((err, sftp) => {
        if(err) { console.error('SFTP Error', err); return conn.end(); }
        
        let done = 0;
        let successCount = 0;
        
        if (uploads.length === 0) {
            console.log("No files to upload.");
            return conn.end();
        }
        
        for (let i = 0; i < uploads.length; i++) {
            const file = uploads[i];
            
            sftp.fastPut(file.local, file.remote, (err) => {
                if(err) {
                    if(err.code === 2) {
                        console.error("Missing directory for " + file.remote);
                    } else {
                        console.error("Error uploading " + file.remote, err.message);
                    }
                } else {
                    successCount++;
                    console.log("Uploaded: " + file.remote);
                }
                
                done++;
                if (done === uploads.length) {
                    console.log("Deployed " + successCount + "/" + uploads.length + " files.");
                    conn.end();
                }
            });
        }
    });
}).connect({ host: '162.244.94.48', port: 22, username: 'ujomorco', password: 'm0qqGV9;S-28Eq' });
