const { IAMClient, PutRolePolicyCommand, GetRolePolicyCommand } = require('@aws-sdk/client-iam');
const fs = require('fs');

async function run() {
    const csv = fs.readFileSync('C:\\Users\\Professional\\Downloads\\UgonduPhysicalTest_accessKeys.csv', 'utf8');
    const [header, values] = csv.trim().split('\n');
    const [accessKeyId, secretAccessKey] = values.split(',');

    const iam = new IAMClient({
        region: 'us-east-1',
        credentials: { accessKeyId, secretAccessKey }
    });

    const policyDocument = {
        Version: "2012-10-17",
        Statement: [
            {
                Sid: "ResolveDefaultAMI",
                Effect: "Allow",
                Action: "ssm:GetParameter",
                Resource: "arn:aws:ssm:us-east-1::parameter/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
            }
        ]
    };

    try {
        console.log('Adding policy to UgonduCORRunner...');
        await iam.send(new PutRolePolicyCommand({
            RoleName: 'UgonduCORRunner',
            PolicyName: 'UgonduCOR-Execution-Policy',
            PolicyDocument: JSON.stringify(policyDocument)
        }));
        console.log('Policy added successfully!');

        console.log('Reading back policy...');
        const response = await iam.send(new GetRolePolicyCommand({
            RoleName: 'UgonduCORRunner',
            PolicyName: 'UgonduCOR-Execution-Policy'
        }));
        console.log('Read back policy:', decodeURIComponent(response.PolicyDocument));
    } catch (e) {
        console.error('Error:', e.message);
    }
}
run();
