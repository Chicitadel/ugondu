const { IAMClient, GetRolePolicyCommand } = require('@aws-sdk/client-iam');
const fs = require('fs');
async function run() {
    const csv = fs.readFileSync('C:\\Users\\Professional\\Downloads\\UgonduPhysicalTest_accessKeys.csv', 'utf8');
    const [header, values] = csv.trim().split('\n');
    const [accessKeyId, secretAccessKey] = values.split(',');

    const iam = new IAMClient({
        region: 'us-east-1',
        credentials: { accessKeyId, secretAccessKey }
    });
    try {
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
