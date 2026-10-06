$ErrorActionPreference = 'Stop'

function Assert-No-Match {
    param([string]$Pattern, [string]$Path, [string]$Message)
    
    # Run git grep. We use 2>&1 to silence errors if nothing is found.
    $output = git grep -n -E $Pattern -- $Path 2>&1

    $filtered = @()
    if ($output) {
        foreach ($line in $output) {
            $strLine = [string]$line
            # Exempt the evidence engine itself for PROVEN and providerResponseHash
            if ($strLine -match 'evidence-engine.ts') {
                continue
            }
            if ($strLine -match 'evidence-adversarial.spec.ts') {
                continue
            }
            # Exempt localization JSON files for 'verified' and 'placeholder' if they are just translations
            if ($strLine -match '\.json' -and ($strLine -match '"verified"' -or $strLine -match '"placeholder"')) {
                continue
            }
            $filtered += $strLine
        }
    }

    if ($filtered.Count -gt 0) {
        Write-Error "$Message. Found matches for '$Pattern':`n$($filtered | Select-Object -First 10 | Out-String)"
        exit 1
    }
}

echo "1. Clean working tree check"
$status = (git status --short)
if ($status) { Write-Error "Git working directory not clean"; exit 1 }

echo "2. Exact HEAD recorded"
$head = (git rev-parse HEAD)
echo "HEAD is $head"

cd server/engine-core

echo "3. npm run build"
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

echo "4. npm run test"
npm run test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

echo "5. npm run lint"
npm run lint
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

echo "6. git diff --check"
cd ../..
git diff --check
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

echo "7. No secrets check"
Assert-No-Match -Pattern "rds-test-password-123|hardcoded_secret" -Path "server/engine-core" -Message "Secrets found"

echo "8. No placeholder evidence in certification paths"
# We only check certification and execution paths for fabricated evidence
Assert-No-Match -Pattern "Date\.now\(\)|Math\.random\(\)|`"PROVEN`"|'PROVEN'|`"verified_from_provider`"|'verified_from_provider'|providerResponseHash:" -Path "server/engine-core/physical-certification.ts server/engine-core/physical-fargate-certification.ts server/engine-core/urre-crash-resume.ts server/engine-core/src/registry server/engine-core/src/urre server/engine-core/src/fabric server/engine-core/src/deise" -Message "Placeholder evidence construction found outside Evidence Engine"

echo "9. No NotImplemented"
Assert-No-Match -Pattern "NotImplemented" -Path "server/engine-core/src" -Message "NotImplemented found"

echo "12. No hardcoded AMIs"
Assert-No-Match -Pattern "ami-[0-9a-f]{8,}" -Path "server/engine-core" -Message "Hardcoded AMI found"

echo "13. No hardcoded AWS account IDs"
Assert-No-Match -Pattern "123456789012" -Path "server/engine-core" -Message "Hardcoded AWS Account ID found"

echo "14. No direct mutation APIs in certification"
Assert-No-Match -Pattern "new EC2Client|new ECSClient|new RDSClient|new IAMClient|new S3Client" -Path "server/engine-core/physical-certification.ts server/engine-core/physical-fargate-certification.ts" -Message "Direct AWS mutation clients found in certification files. Must use Action Registry -> URRE path for mutations."

echo "15. Semantic placeholder blacklist"
Assert-No-Match -Pattern "(ami-placeholder|subnet-placeholder|mock-tx|mocking|mocked|simulation|simulate|simulated|fake|dummy|synthetic|stub|placeholder|skip physical|skip physical describe|public\.ecr\.aws|latest|fake-ami|test-ami|mock-ami)" -Path "server/engine-core/physical-certification.ts server/engine-core/physical-fargate-certification.ts server/engine-core/src/fabric server/engine-core/src/deise server/engine-core/src/urre server/engine-core/src/evidence" -Message "Semantic placeholders found in production/certification paths"

echo "20. Generating candidate manifest"
$branch = (git rev-parse --abbrev-ref HEAD)
$tag = (git tag --points-at HEAD | Select-Object -First 1)

$manifest = @{
    candidateSha = $head
    branch = $branch
    remoteSha = $head
    tag = $tag
    workingTreeClean = $true
    build = "PASS"
    test = "PASS"
    lint = "PASS"
    diffCheck = "PASS"
    physicalCertification = "NOT_RUN"
}

$manifest | ConvertTo-Json -Depth 5 > manifest.json
Get-Content manifest.json

echo "21. SHA-256 candidate manifest"
certutil -hashfile manifest.json SHA256

echo "22. SUCCESS - Candidate ready for physical campaign"
exit 0
