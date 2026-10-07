const fs = require('fs');
const path = require('path');

function fixTests(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));
    for (const f of files) {
        const fullPath = path.join(dir, f);
        let content = fs.readFileSync(fullPath, 'utf8');
        let changed = false;

        if (content.includes('__t(') && !content.includes('import { __t }')) {
            const importStr = "import { __t } from '../../../shared/i18n';\n";
            // Find the last import
            const lastImportIndex = content.lastIndexOf('import ');
            if (lastImportIndex !== -1) {
                const endOfLastImport = content.indexOf('\n', lastImportIndex);
                content = content.slice(0, endOfLastImport + 1) + importStr + content.slice(endOfLastImport + 1);
            } else {
                content = importStr + content;
            }
            changed = true;
        }

        if (fullPath.includes('gcp-iam.lifecycle.spec.ts')) {
            if (content.includes(`reporting the provider\\__t('s_reason')`)) {
                content = content.replace(`reporting the provider\\__t('s_reason')`, `reporting the provider's reason'`);
                changed = true;
            }
        }

        if (changed) {
            fs.writeFileSync(fullPath, content);
            console.log('Fixed', fullPath);
        }
    }
}

fixTests('server/uppie/src/tests');
fixTests('server/capabilities/src/tests');
