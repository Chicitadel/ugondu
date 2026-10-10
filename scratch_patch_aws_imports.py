import os

# 1. aws-authorization.ts
file_path = "server/engine-core/src/identity/credential-intake/providers/aws/aws-authorization.ts"
if os.path.exists(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()
    content = content.replace("import { IAMClient, SimulatePrincipalPolicyCommand } from '@aws-sdk/client-iam';", "")
    content = content.replace("const iam = new IAMClient", "const { IAMClient, SimulatePrincipalPolicyCommand } = require('@aws-sdk/client-iam');\n        const iam = new IAMClient")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

# 2. aws-normalization.ts
file_path2 = "server/engine-core/src/identity/credential-intake/providers/aws/aws-normalization.ts"
if os.path.exists(file_path2):
    with open(file_path2, "r", encoding="utf-8") as f:
        content2 = f.read()
    content2 = content2.replace("import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';", "")
    content2 = content2.replace("const sts = new STSClient", "const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');\n        const sts = new STSClient")
    with open(file_path2, "w", encoding="utf-8") as f:
        f.write(content2)

# 3. urre-crash-resume.ts
file_path3 = "server/engine-core/urre-crash-resume.ts"
if os.path.exists(file_path3):
    with open(file_path3, "r", encoding="utf-8") as f:
        content3 = f.read()
    content3 = content3.replace("import { EC2Client, DescribeInstancesCommand } from '@aws-sdk/client-ec2';", "")
    content3 = content3.replace("const ec2 = new EC2Client", "const { EC2Client, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');\nconst ec2 = new EC2Client")
    with open(file_path3, "w", encoding="utf-8") as f:
        f.write(content3)

print("Patched AWS imports")
