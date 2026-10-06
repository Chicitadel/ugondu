const fs = require('fs');
let c = fs.readFileSync('server/engine-core/physical-certification.ts', 'utf8');

c = c.replace(
    /const subDesc = await ec2Injector.describeSubnets\(\{ SubnetIds: \[sub1Id\] \}\).catch\(\(\) => null\);/g,
    "const subDesc = await ec2Injector.describeSubnets({ SubnetIds: [sub1Id] }).catch(() => null);\n        const instDesc = await ec2Injector.describeInstances({ InstanceIds: [instanceId] }).catch(() => null);\n        const rdsDesc = await (ec2Injector as any).describeDBInstances({ DBInstanceIdentifier: 'test' }).catch(() => null);\n        const s3Desc = await (ec2Injector as any).headBucket({ Bucket: 'test' }).catch(() => null);"
);

c = c.replace(
    /if \(vpcDesc \|\| subDesc\) throw new Error\("Residual Scan FAILED! Resources leaked."\);/g,
    'if (vpcDesc || subDesc || instDesc || rdsDesc || s3Desc) throw new Error("Residual Scan FAILED! Resources leaked.");'
);

fs.writeFileSync('server/engine-core/physical-certification.ts', c);
