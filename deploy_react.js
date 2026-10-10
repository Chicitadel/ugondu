const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    console.log('Connected to DirectAdmin server for React Hub Deployment.');
    conn.sftp((err, sftp) => {
        if(err) { console.error(err); return conn.end(); }
        console.log('Uploading react_hub.zip...');
        sftp.fastPut('D:/ujomor-platform/products/ugondu/react_hub.zip', '/home/ujomorco/react_hub.zip', (err) => {
            if(err) { console.error('Upload failed', err); return conn.end(); }
            console.log('Upload complete. Executing extraction...');
            const script = `
                set -e
                echo "--> Setting up hub.airroofers.eu for React SPA"
                cd ~/domains/hub.airroofers.eu
                
                # Backup current public_html if needed
                if [ -d "public_html" ] && [ ! -L "public_html" ]; then
                    mv public_html public_html_bak_$(date +%s)
                fi
                
                # If public_html is a symlink to 'current' (which we did earlier for monolith), remove it
                if [ -L "public_html" ]; then
                    rm -f public_html
                fi
                
                # Make fresh public_html
                mkdir -p public_html
                
                # Extract React Build
                unzip -o -q ~/react_hub.zip -d public_html
                
                find public_html -type d -exec chmod 755 {} \\;
                find public_html -type f -exec chmod 644 {} \\;

                echo "DEPLOY_REACT_SUCCESSFUL"
            `;
            conn.exec(script, (err, stream) => {
                stream.on('close', () => { console.log('Session closed.'); conn.end(); })
                      .on('data', (d) => process.stdout.write(d.toString()))
                      .stderr.on('data', (d) => process.stderr.write(d.toString()));
            });
        });
    });
}).connect({ host: '162.244.94.48', port: 22, username: 'ujomorco', password: 'm0qqGV9;S-28Eq' });
