# Lightweight PowerShell regression tests; no Pester or host credentials required.
$ErrorActionPreference = "Stop"
$scriptPath = Join-Path (Split-Path -Parent $PSScriptRoot) "deploy-directadmin-staging.ps1"
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("ugondu-directadmin-test-" + [Guid]::NewGuid().ToString("N"))
$stageRoot = Join-Path $tempRoot "deploy/directadmin"
$target = Join-Path $stageRoot "test.example.com"

function Assert([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw "ASSERTION FAILED: $Message" }
}

try {
    New-Item -ItemType Directory -Path $target -Force | Out-Null
    Set-Content -LiteralPath (Join-Path $target ".htaccess") -Value "# test fixture"

    # Positive path: a valid staged domain creates an artifact-only status.
    & $scriptPath -TargetSubdomain "test.example.com" -Root $tempRoot | Out-Null
    $health = Get-Content -LiteralPath (Join-Path $target "health.json") -Raw | ConvertFrom-Json
    Assert ($health.status -eq "ARTIFACT_STAGED_NOT_HOST_QUALIFIED") "staging must not claim live-host qualification"
    Assert ($health.host_qualification -eq "NOT_RUN") "live qualification must remain explicitly not run"
    Assert ($health.domain -eq "test.example.com") "health artifact must use the selected target"

    # Negative path: traversal-like targets must fail before writing outside the staging root.
    $rejected = $false
    try {
        & $scriptPath -TargetSubdomain "../../escape" -Root $tempRoot | Out-Null
    } catch {
        $rejected = $true
    }
    Assert $rejected "path traversal target must be rejected"
    Assert (-not (Test-Path -LiteralPath (Join-Path $tempRoot "escape"))) "traversal must not create an outside target"

    # Negative path: a malformed DNS label must fail closed.
    $rejected = $false
    try {
        & $scriptPath -TargetSubdomain "bad..example.com" -Root $tempRoot | Out-Null
    } catch {
        $rejected = $true
    }
    Assert $rejected "empty DNS labels must be rejected"

    Write-Output "PASS: DirectAdmin staging path containment and truthful evidence tests"
} finally {
    if (Test-Path -LiteralPath $tempRoot) {
        Remove-Item -LiteralPath $tempRoot -Recurse -Force
    }
}
