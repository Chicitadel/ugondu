# /******************************************************************************
#  * Project        : Air Roofers Platform
#  * Script         : tools/deploy-directadmin-staging.ps1
#  * Author         : Enterprise Architecture Council / Air Roofers SASU
#  * Organization   : Air Roofers SASU
#  * Classification : Enterprise Sovereign Infrastructure
#  *
#  * Packages the DirectAdmin public_html bundle for the product subdomain.
#  * The target subdomain is discovered from deploy/directadmin/<subdomain>/
#  * (no product or domain name is hardcoded); pass -TargetSubdomain to override.
#  ******************************************************************************/

param (
    [string]$TargetSubdomain = "",
    [string]$Root = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = "Stop"
$base = Join-Path $Root "deploy/directadmin"

if (-not $TargetSubdomain) {
    $found = @(Get-ChildItem $base -Directory -ErrorAction SilentlyContinue)
    if ($found.Count -ne 1) { throw "Specify -TargetSubdomain; found $($found.Count) candidates under $base" }
    $TargetSubdomain = $found[0].Name
}

$dir = Join-Path $base $TargetSubdomain
$htaccess = Join-Path $dir ".htaccess"
if (-not (Test-Path $htaccess)) { throw ".htaccess missing at $htaccess" }

$health = @{
    domain       = $TargetSubdomain
    status       = "STAGING_READY"
    generated_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json
Set-Content -Path (Join-Path $dir "health.json") -Value $health

Write-Host "Staged for upload to ~/domains/$TargetSubdomain/public_html/:" -ForegroundColor Green
Get-ChildItem $dir -Force | Select-Object Name, Length | Format-Table -AutoSize
