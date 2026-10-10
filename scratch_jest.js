const fs = require('fs');
const dirs = ['server/uppie', 'server/capabilities', 'server/tests', 'server/shared', 'server/engine-core'];
for (const dir of dirs) {
    const file = dir + '/jest.config.js';
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        if (!content.includes('transformIgnorePatterns')) {
            content = content.replace(/};\s*$/, "  transformIgnorePatterns: ['node_modules/(?!(canonicalize)/)'],\n};\n");
            fs.writeFileSync(file, content);
            console.log('Fixed', file);
        }
    }
}
