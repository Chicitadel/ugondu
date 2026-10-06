$ErrorActionPreference = 'Stop'

param (
    [string]$ExpectedTag = ""
)

function Assert-No-Match {
    param([string]$Pattern, [string]$Path, [string]$Message)
    $output = git grep -n -E $Pattern -- $Path 2>&1
    $filtered = @()
    if ($output) {
        foreach ($line in $output) {
            $strLine = [string]$line
            if ($strLine -match 'evidence-engine.ts' -or $strLine -match 'evidence-adversarial.spec.ts') { continue }
            if ($strLine -match '\.json' -and ($strLine -match '"verified"' -or $strLine -match '"placeholder"')) { continue }
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

$branch = (git rev-parse --abbrev-ref HEAD)

if ($ExpectedTag) {
    echo "3. Remote verification"
    # Ensure remote branch is in sync
    git fetch origin $branch
    $remoteHead = (git rev-parse origin/$branch)
    if ($head -ne $remoteHead) {
        Write-Error "Local HEAD ($head) does not match origin/$branch ($remoteHead)"
        exit 1
    }
    
    # Ensure tag exists remotely and matches
    $remoteTagSha = (git ls-remote origin refs/tags/$ExpectedTag | ForEach-Object { ($_ -split "`t")[0] })
    if (-not $remoteTagSha) {
        Write-Error "Tag $ExpectedTag not found on remote origin"
        exit 1
    }
    # Dereference the tag if it's an annotated tag. 
    $remoteTagPeeled = (git ls-remote origin refs/tags/$ExpectedTag^{} | ForEach-Object { ($_ -split "`t")[0] })
    if ($remoteTagPeeled) { $remoteTagSha = $remoteTagPeeled }

    if ($head -ne $remoteTagSha) {
        Write-Error "Remote tag $ExpectedTag ($remoteTagSha) does not match local HEAD ($head)"
        exit 1
    }
    echo "Remote SHA and Tag verified."

    echo "4. Checking GitHub Actions Release Pipeline"
    # Check workflow
    $runData = (gh run list --branch $ExpectedTag --workflow release.yml --json status,conclusion,databaseId --limit 1 | ConvertFrom-Json)
    if ($runData.Count -eq 0 -or $runData[0].status -ne 'completed') {
        Write-Error "Release pipeline for $ExpectedTag is not completed."
        exit 1
    }
    if ($runData[0].conclusion -ne 'success') {
        Write-Error "Release pipeline for $ExpectedTag failed!"
        exit 1
    }
    echo "GitHub Actions Release Pipeline passed."
}

cd server/engine-core

echo "5. npm run build"
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

echo "6. npm run test"
npm run test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

echo "7. npm run lint"
npm run lint
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

echo "8. git diff --check"
cd ../..
git diff --check
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

echo "9. No secrets check"
Assert-No-Match -Pattern "rds-test-password-123|hardcoded_secret" -Path "server/engine-core" -Message "Secrets found"

echo "10. No placeholder evidence in certification paths"
Assert-No-Match -Pattern "Date\.now\(\)|Math\.random\(\)|`"PROVEN`"|'PROVEN'|`"verified_from_provider`"|'verified_from_provider'|providerResponseHash:" -Path "server/engine-core/physical-certification.ts server/engine-core/physical-fargate-certification.ts server/engine-core/urre-crash-resume.ts server/engine-core/src/registry server/engine-core/src/urre server/engine-core/src/fabric server/engine-core/src/deise" -Message "Placeholder evidence construction found outside Evidence Engine"

echo "11. No NotImplemented"
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
    remoteReleasePipeline = if ($ExpectedTag) { "PASS" } else { "NOT_CHECKED" }
    physicalCertification = "NOT_RUN"
}

$manifest | ConvertTo-Json -Depth 5 > manifest.json
Get-Content manifest.json

echo "21. SHA-256 candidate manifest"
certutil -hashfile manifest.json SHA256

echo "22. SUCCESS - Candidate ready for physical campaign"
exit 0
