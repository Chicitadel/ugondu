const fs = require('fs');
const streamId = process.argv[2];
const schedule = JSON.parse(fs.readFileSync('.governance/cor/cor_final_remediation_task_schedule.json', 'utf8'));
const stream = schedule.streams.find(s => s.id === streamId);
if (!stream) { console.error('Stream not found'); process.exit(1); }
if (stream.status !== 'COMPLETED') { console.error('Stream objective not physically met'); process.exit(1); }
console.log(\Physical qualification for \ validated.\);
process.exit(0);
