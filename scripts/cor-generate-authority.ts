import { CORAuthorityCalculator } from '../server/engine-core/src/assurance/authority/cor-authority-generator';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Usage: node scripts/cor-generate-authority.js

async function main() {
    const calculator = new CORAuthorityCalculator();
    
    const accountId = process.env.AWS_ACCOUNT_ID || '971671216490';
    const region = process.env.AWS_REGION || 'us-east-1';
    const roleName = 'UgonduCORRunner';

    const manifest = calculator.generateAwsManifest(region, accountId, roleName);
    const iamPolicy = calculator.exportToIAMPolicy(manifest);
    const humanOutput = calculator.dumpHumanReadable(manifest);

    // Write outputs to artifacts directory
    const outputDir = join(process.cwd(), 'artifacts', 'authority');
    mkdirSync(outputDir, { recursive: true });

    writeFileSync(join(outputDir, 'cor-authority-manifest.json'), JSON.stringify(manifest, null, 2));
    writeFileSync(join(outputDir, 'cor-execution-policy.json'), JSON.stringify(iamPolicy, null, 2));
    writeFileSync(join(outputDir, 'UGONDU_COR_AUTHORITY_REQUEST.txt'), humanOutput);

    console.log(humanOutput);
    console.log('\n✅ Authority artifacts generated successfully in artifacts/authority/');
}

main().catch(console.error);
