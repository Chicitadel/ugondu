# /******************************************************************************
#  * Project        : Air Roofers Platform
#  * Script         : tools/deploy-directadmin-staging.ps1
#  * Organization   : Air Roofers SASU
#  *
#  * Packages a DirectAdmin public_html bundle for a selected staged domain.
#  * This script only stages an artifact; it does not upload, deploy, or qualify
#  * the live host. The target must be a DNS name and a direct child directory
#  * of deploy/directadmin. Resolved-path containment is checked before writes.
#  ******************************************************************************/

[CmdletBinding()]
param (
    [string]$TargetSubdomain = "",
    [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"

function Assert-DnsName([string]$Value) {
    if ([string]::IsNullOrWhiteSpace($Value) -or $Value.Length -gt 253) {
        throw "Invalid target DNS name."
    }

    $labels = $Value.Split('.')
    foreach ($label in $labels) {
        if ($label.Length -lt 1 -or $label.Length -gt 63 -or
            $label -notmatch '^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$') {
            throw "Invalid target DNS name."
        }
    }
}

$baseCandidate = Join-Path ([IO.Path]::GetFullPath($Root)) "deploy/directadmin"
if (-not (Test-Path -LiteralPath $baseCandidate -PathType Container)) {
    throw "DirectAdmin staging root is missing."
}
$base = (Resolve-Path -LiteralPath $baseCandidate).Path
$baseFull = [IO.Path]::GetFullPath($base).TrimEnd([IO.Path]::DirectorySeparatorChar)
$basePrefix = $baseFull + [IO.Path]::DirectorySeparatorChar

if (-not $TargetSubdomain) {
    $found = @(Get-ChildItem -LiteralPath $base -Directory -ErrorAction SilentlyContinue)
    if ($found.Count -ne 1) { throw "Specify -TargetSubdomain; found $($found.Count) candidates under $base" }
    $TargetSubdomain = $found[0].Name
}

Assert-DnsName $TargetSubdomain
$dirCandidate = Join-Path $base $TargetSubdomain
if (-not (Test-Path -LiteralPath $dirCandidate -PathType Container)) {
    throw "Target staging directory does not exist."
}

$dir = (Resolve-Path -LiteralPath $dirCandidate).Path
$dirFull = [IO.Path]::GetFullPath($dir)
if (-not $dirFull.StartsWith($basePrefix, [StringComparison]::OrdinalIgnoreCase) -or
    (Split-Path -Parent $dirFull) -ne $baseFull -or
    (Split-Path -Leaf $dirFull) -ne $TargetSubdomain) {
    throw "Target staging directory escapes the approved staging root."
}

$htaccessCandidate = Join-Path $dir ".htaccess"
if (-not (Test-Path -LiteralPath $htaccessCandidate -PathType Leaf)) {
    throw ".htaccess must exist as a regular file in the selected staging directory."
}
$htaccess = (Resolve-Path -LiteralPath $htaccessCandidate).Path
if (-not $htaccess.StartsWith($dirFull.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw ".htaccess resolves outside the selected staging directory."
}

$health = @{
    domain             = $TargetSubdomain
    status             = "ARTIFACT_STAGED_NOT_HOST_QUALIFIED"
    host_qualification = "NOT_RUN"
    evidence_scope     = "artifact-only"
    generated_at       = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json
Set-Content -LiteralPath (Join-Path $dir "health.json") -Value $health -Encoding utf8

Write-Host "Artifact staged for upload to ~/domains/$TargetSubdomain/public_html/; live-host qualification has NOT run."
Get-ChildItem -LiteralPath $dir -Force | Select-Object Name, Length | Format-Table -AutoSize
