const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
    conn.sftp((err, sftp) => {
        if(err) throw err;
        
        let files = [
            ['D:/ujomor-platform/platform-core/license.airroofers.eu/public_html/Mandatag/Api/PublicApi/LicenseVerifyController.php', '/home/ujomorco/domains/license.airroofers.eu/public_html/Mandatag/Api/PublicApi/LicenseVerifyController.php'],
            ['D:/ujomor-platform/platform-core/license.airroofers.eu/public_html/Mandatag/AdminUi/helpers/io.php', '/home/ujomorco/domains/license.airroofers.eu/public_html/Mandatag/AdminUi/helpers/io.php'],
            ['D:/ujomor-platform/platform-core/license.airroofers.eu/public_html/Mandatag/AdminUi/components/auto_menu.php', '/home/ujomorco/domains/license.airroofers.eu/public_html/Mandatag/AdminUi/components/auto_menu.php'],
            ['D:/ujomor-platform/platform-core/license.airroofers.eu/public_html/Mandatag/AdminUi/pages/activations.php', '/home/ujomorco/domains/license.airroofers.eu/public_html/Mandatag/AdminUi/pages/activations.php'],
            ['D:/ujomor-platform/platform-core/license.airroofers.eu/public_html/Mandatag/AdminUi/pages/activations.view.php', '/home/ujomorco/domains/license.airroofers.eu/public_html/Mandatag/AdminUi/pages/activations.view.php'],
            ['D:/ujomor-platform/platform-core/license.airroofers.eu/public_html/Mandatag/Domain/Lifecycle/LicenseLifecycleManager.php', '/home/ujomorco/domains/license.airroofers.eu/public_html/Mandatag/Domain/Lifecycle/LicenseLifecycleManager.php'],
            ['D:/ujomor-platform/platform-core/license.airroofers.eu/public_html/Mandatag/AdminUi/Providers/PlatformHealthProvider.php', '/home/ujomorco/domains/license.airroofers.eu/public_html/Mandatag/AdminUi/Providers/PlatformHealthProvider.php'],
            ['D:/ujomor-platform/platform-core/license.airroofers.eu/public_html/Mandatag/AdminUi/Widgets/PlatformHealthWidget.php', '/home/ujomorco/domains/license.airroofers.eu/public_html/Mandatag/AdminUi/Widgets/PlatformHealthWidget.php'],
            ['D:/ujomor-platform/static/global/js/license-inspector.js', '/home/ujomorco/domains/static.airroofers.eu/public_html/global/js/license-inspector.js']
        ];
        
        let done = 0;
        let successCount = 0;
        for (let i = 0; i < files.length; i++) {
            sftp.fastPut(files[i][0], files[i][1], (err) => {
                if(err) {
                    console.error("Error uploading " + files[i][1], err);
                } else {
                    successCount++;
                }
                done++;
                if (done === files.length) {
                    console.log("Deployed " + successCount + "/" + files.length + " files.");
                    
                    // Also create lang directory if it doesn't exist and upload json files
                    sftp.mkdir('/home/ujomorco/domains/license.airroofers.eu/public_html/Mandatag/lang', (err) => {
                        // ignore error if exists
                        let langFiles = [
                            ['D:/ujomor-platform/platform-core/license.airroofers.eu/public_html/Mandatag/lang/en.json', '/home/ujomorco/domains/license.airroofers.eu/public_html/Mandatag/lang/en.json'],
                            ['D:/ujomor-platform/platform-core/license.airroofers.eu/public_html/Mandatag/lang/fr.json', '/home/ujomorco/domains/license.airroofers.eu/public_html/Mandatag/lang/fr.json']
                        ];
                        let langDone = 0;
                        for (let j = 0; j < langFiles.length; j++) {
                            sftp.fastPut(langFiles[j][0], langFiles[j][1], (err) => {
                                langDone++;
                                if (langDone === langFiles.length) {
                                    console.log("Deployed lang files.");
                                    conn.end();
                                }
                            });
                        }
                    });
                }
            });
        }
    });
}).connect({ host: '162.244.94.48', port: 22, username: 'ujomorco', password: 'm0qqGV9;S-28Eq' });
