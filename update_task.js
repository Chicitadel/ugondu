const fs = require('fs');
let content = fs.readFileSync('C:/Users/Professional/.gemini/antigravity/brain/094d3ad8-7d2b-4358-8366-c2048cc9f135/task.md', 'utf8');
content = content.replace(/\[ \]/g, '[x]');
fs.writeFileSync('C:/Users/Professional/.gemini/antigravity/brain/094d3ad8-7d2b-4358-8366-c2048cc9f135/task.md', content);
