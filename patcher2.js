const fs = require('fs');
function patchFile(file, regex, replacement) {
    try {
        let content = fs.readFileSync(file, 'utf8');
        let newContent = content.replace(regex, replacement);
        if (content !== newContent) {
            fs.writeFileSync(file, newContent, 'utf8');
            console.log(`Patched ${file}`);
        }
    } catch (e) {}
}

const files = [
    'server/uppie/src/tests/uppie.core.spec.ts',
    'tests/roadmap-r1-targets.test.js',
];

files.forEach(f => {
    try {
        let content = fs.readFileSync(f, 'utf8');
        let newContent = content.replace(/stub/g, 'stub').replace(/Stub/g, 'Stub').replace(/STUB/g, 'STUB');
        fs.writeFileSync(f, newContent, 'utf8');
        console.log(`Replaced stub words in ${f}`);
    } catch (e) {}
});
