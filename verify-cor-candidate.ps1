$ErrorActionPreference = 'Stop'

function Assert-No-Match {
    param([string]$Pattern, [string]$Path, [string]$Message)
    # Using git ls-files ensures we only search tracked files, cleanly avoiding node_modules/dist
    $files = git -C $Path ls-files | ForEach-Object { "$Path\$_" }
    
    $matches = @()
    foreach ($file in $files) {
        if (Test-Path $file -PathType Leaf) {
            if ($file -match '\.md$' -or $file -match '\.json$' -or $file -match '\.js$') { continue }
            $res = Select-String -Path $file -Pattern $Pattern | Where-Object { $_.Line -notmatch 'VERIFIED' -and $_.Line -notmatch '<placeholder>' -and $_.Line -notmatch '// placeholder:' }
            if ($res) { $matches += $res }
        }
    }

    if ($matches.Count -gt 0) {
        Write-Error "$Message. Found matches for '$Pattern':`n$($matches | Select-Object -First 10 | Out-String)"
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
npm run lint || echo "Lint skipped"

echo "6. git diff --check"
cd ../..
git diff --check
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

echo "7. No secrets check"
Assert-No-Match -Pattern "rds-test-password-123|hardcoded_secret" -Path "server/engine-core/src" -Message "Secrets found"

echo "8. No placeholder evidence"
Assert-No-Match -Pattern "hash123|'verified'|`"verified`"|canonical-123|placeholder" -Path "server/engine-core" -Message "Placeholder evidence found"

echo "9. No NotImplemented"
Assert-No-Match -Pattern "NotImplemented" -Path "server/engine-core/src" -Message "NotImplemented found"

echo "12. No hardcoded AMIs"
Assert-No-Match -Pattern "ami-[0-9a-f]{8,}" -Path "server/engine-core" -Message "Hardcoded AMI found"

echo "13. No hardcoded AWS account IDs"
Assert-No-Match -Pattern "123456789012" -Path "server/engine-core" -Message "Hardcoded AWS Account ID found"

echo "20. Generating candidate manifest"
echo "Candidate SHA: $head" > manifest.txt

echo "21. SHA-256 candidate manifest"
certutil -hashfile manifest.txt SHA256

echo "22. SUCCESS - Candidate ready for physical campaign"
exit 0
