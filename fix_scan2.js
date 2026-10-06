const fs = require('fs');
let c = fs.readFileSync('server/engine-core/physical-certification.ts', 'utf8');
c = c.replace(
    'if (vpcDesc || subDesc || instDesc || rdsDesc || s3Desc) throw new Error("Residual Scan FAILED! Resources leaked.");',
    'if ((vpcDesc ? 1 : 0) + (subDesc ? 1 : 0) + (instDesc ? 1 : 0) + (rdsDesc ? 1 : 0) + (s3Desc ? 1 : 0) !== 0) throw new Error("Residual Scan FAILED! Resources leaked.");'
);
fs.writeFileSync('server/engine-core/physical-certification.ts', c);
