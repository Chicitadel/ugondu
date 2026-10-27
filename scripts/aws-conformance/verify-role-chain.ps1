<#
 * Project        : Ugondu — Universal Delivery Operating System
 * Module         : COR / AWS Role-Chain Verification
 * File           : verify-role-chain.ps1
 * Version        : 1.0.0
 * Author         : Ujomor Systems Engineering & Governance Authority
 * Organization   : Air Roofers (Société par actions simplifiée, RCS Paris 943 432 534)
 * Created Date   : 2026-10-21
 * Classification : ENTERPRISE
 *
 * Purpose: READ-ONLY inspection of the runner -> execution role delegation chain.
 * Run with an authorized inspection identity (never the runner, never a broad user).
 *
 * Verdicts (three-state, never inferred from a failed read):
 *   PASS          evidence retrieved and requirement satisfied
 *   FAIL          evidence retrieved and requirement NOT satisfied
 *   INCONCLUSIVE  evidence could not be retrieved (AccessDenied, throttling, bad JSON)
 *
 * This script never calls sts:AssumeRole. The live assumption proof must come from the
 * OIDC workflow (.github/workflows/cor.yml), which authenticates as the runner role.
#>
[CmdletBinding()]
param(
    [string]$TargetConfig = (Join-Path $PSScriptRoot '../../config/qualification/aws-target.json'),
    [Parameter(Mandatory)][string]$TargetId,
    [string]$RunnerRoleName = 'UgonduCORRunner'
)

$ErrorActionPreference = 'Stop'
$results = [System.Collections.Generic.List[object]]::new()

function Add-Verdict([string]$Check, [string]$Verdict, [string]$Detail) {
    $results.Add([pscustomobject]@{ Check = $Check; Verdict = $Verdict; Detail = $Detail })
}

function Invoke-AwsJson([string[]]$CliArgs) {
    $output = & aws @CliArgs --output json --no-cli-pager 2>&1
    if ($LASTEXITCODE -ne 0) { throw "aws $($CliArgs -join ' ') failed: $($output -join ' ')" }
    try { return ($output -join "`n") | ConvertFrom-Json -ErrorAction Stop }
    catch { throw "aws returned non-JSON output; refusing to continue." }
}

function ConvertTo-Array($Value) { if ($null -eq $Value) { @() } else { @($Value) } }

$target = (Get-Content -Raw $TargetConfig | ConvertFrom-Json).targets | Where-Object { $_.id -eq $TargetId }
if (-not $target) { throw "Target '$TargetId' not found in $TargetConfig (fail closed)." }

$accountId = $target.accountId
$execRole = $target.executionRoleName
$execArn = "arn:aws:iam::${accountId}:role/${execRole}"
$runnerArn = "arn:aws:iam::${accountId}:role/${RunnerRoleName}"

# 0. Identify the inspecting caller and confirm it is the expected account.
try {
    $caller = Invoke-AwsJson @('sts', 'get-caller-identity')
    if ($caller.Account -ne $accountId) {
        Add-Verdict 'caller-account' 'FAIL' "Caller account $($caller.Account) is not the target account."
        $results | Format-Table -AutoSize -Wrap; exit 2
    }
    Add-Verdict 'caller-account' 'PASS' "Inspecting as $($caller.Arn)"
    if ($caller.Arn -match ":assumed-role/${RunnerRoleName}/" -or $caller.Arn -match "role/${execRole}") {
        Add-Verdict 'caller-separation' 'FAIL' 'Inspection must not run as the runner or execution role.'
    }
} catch { Add-Verdict 'caller-account' 'INCONCLUSIVE' $_.Exception.Message }

# 1. Runner permissions: locate the policy as INLINE (role policy) or MANAGED (attached),
#    then require the delegation statement. A role may carry either kind; both are evaluated.
try {
    $docs = [System.Collections.Generic.List[object]]::new()

    $inlineNames = ConvertTo-Array (Invoke-AwsJson @('iam', 'list-role-policies', '--role-name', $RunnerRoleName)).PolicyNames
    foreach ($n in $inlineNames) {
        $d = (Invoke-AwsJson @('iam', 'get-role-policy', '--role-name', $RunnerRoleName, '--policy-name', $n)).PolicyDocument
        $docs.Add([pscustomobject]@{ Kind = 'inline'; Name = $n; Document = $d })
    }
    $attached = ConvertTo-Array (Invoke-AwsJson @('iam', 'list-attached-role-policies', '--role-name', $RunnerRoleName)).AttachedPolicies
    foreach ($a in $attached) {
        $v = (Invoke-AwsJson @('iam', 'get-policy', '--policy-arn', $a.PolicyArn)).Policy.DefaultVersionId
        if ([string]::IsNullOrWhiteSpace($v)) { throw "No default version for $($a.PolicyArn)." }
        $d = (Invoke-AwsJson @('iam', 'get-policy-version', '--policy-arn', $a.PolicyArn, '--version-id', $v)).PolicyVersion.Document
        $docs.Add([pscustomobject]@{ Kind = 'managed'; Name = $a.PolicyName; Document = $d })
    }

    $inventory = ($docs | ForEach-Object { "$($_.Kind):$($_.Name)" }) -join ', '
    Add-Verdict 'runner-policy-inventory' ($(if ($docs.Count -gt 0) { 'PASS' } else { 'FAIL' })) "Policies on ${RunnerRoleName}: $inventory"

    $hit = $null
    foreach ($entry in $docs) {
        $m = ConvertTo-Array $entry.Document.Statement | Where-Object {
            $a = ConvertTo-Array $_.Action; $r = ConvertTo-Array $_.Resource
            $_.Effect -eq 'Allow' -and ($a -contains 'sts:AssumeRole') -and ($a -contains 'sts:TagSession') -and ($r -contains $execArn)
        }
        if ($m) { $hit = "$($entry.Kind):$($entry.Name)" }
    }
    Add-Verdict 'runner-delegation-statement' ($(if ($hit) { 'PASS' } else { 'FAIL' })) "Allow sts:AssumeRole+sts:TagSession on $execArn found in: $(if ($hit) { $hit } else { 'none' })"

    $denies = foreach ($entry in $docs) { ConvertTo-Array $entry.Document.Statement | Where-Object { $_.Effect -eq 'Deny' -and ((ConvertTo-Array $_.Action) -match '^(sts:\*|\*|sts:(AssumeRole|TagSession))$') } }
    if ($denies) { Add-Verdict 'runner-explicit-deny' 'FAIL' 'An explicit Deny on sts actions exists in a runner policy.' }

    $role = (Invoke-AwsJson @('iam', 'get-role', '--role-name', $RunnerRoleName)).Role
    if ($role.PermissionsBoundary) { Add-Verdict 'runner-permissions-boundary' 'FAIL' "Boundary set: $($role.PermissionsBoundary.PermissionsBoundaryArn) (must be reviewed against sts actions)" }
    else { Add-Verdict 'runner-permissions-boundary' 'PASS' 'No permissions boundary.' }

    # Authoritative identity-side evaluation (does not evaluate the trust policy).
    $sim = Invoke-AwsJson @('iam', 'simulate-principal-policy', '--policy-source-arn', $runnerArn, '--action-names', 'sts:AssumeRole', 'sts:TagSession', '--resource-arns', $execArn)
    foreach ($r in ConvertTo-Array $sim.EvaluationResults) {
        Add-Verdict "simulate:$($r.EvalActionName)" ($(if ($r.EvalDecision -eq 'allowed') { 'PASS' } else { 'FAIL' })) "Decision: $($r.EvalDecision)"
    }
} catch { Add-Verdict 'runner-policy' 'INCONCLUSIVE' $_.Exception.Message }
# 2. Execution role trust: runner principal + required tag condition.
try {
    $role = Invoke-AwsJson @('iam', 'get-role', '--role-name', $execRole)
    $trust = $role.Role.AssumeRolePolicyDocument
    $allow = ConvertTo-Array $trust.Statement | Where-Object { $_.Effect -eq 'Allow' }
    $principalOk = $false; $tagActions = $false; $tagCondition = $false; $condJson = 'none'; $tagKeysRestrictive = $false
    foreach ($s in $allow) {
        if ((ConvertTo-Array $s.Principal.AWS) -contains $runnerArn) {
            $principalOk = $true
            $acts = ConvertTo-Array $s.Action
            if ($acts -contains 'sts:TagSession' -or $acts -contains 'sts:*') { $tagActions = $true }
            $condJson = ($s.Condition | ConvertTo-Json -Depth 8 -Compress)
            if ($condJson -match 'UgonduTransactionId') { $tagCondition = $true }
            if ($condJson -match 'aws:TagKeys' -and $condJson -notmatch 'UgonduCOR') { $tagKeysRestrictive = $true }
        }
    }
    Add-Verdict 'exec-trust-principal' ($(if ($principalOk) { 'PASS' } else { 'FAIL' })) "Trusts ${runnerArn}: $principalOk"
    Add-Verdict 'exec-trust-tagsession' ($(if ($tagActions) { 'PASS' } else { 'FAIL' })) "Trust grants sts:TagSession: $tagActions"
    Add-Verdict 'exec-trust-tag-condition' ($(if ($tagCondition -and -not $tagKeysRestrictive) { 'PASS' } else { 'FAIL' })) "Condition=$condJson (omits UgonduCOR in aws:TagKeys=$tagKeysRestrictive)"
} catch { Add-Verdict 'exec-trust' 'INCONCLUSIVE' $_.Exception.Message }

# 3. Runner OIDC trust (read-only): GitHub OIDC provider with audience restriction.
try {
    $runner = Invoke-AwsJson @('iam', 'get-role', '--role-name', $RunnerRoleName)
    $rt = $runner.Role.AssumeRolePolicyDocument | ConvertTo-Json -Depth 10
    $ok = ($rt -match 'token\.actions\.githubusercontent\.com') -and ($rt -match 'sts\.amazonaws\.com')
    Add-Verdict 'runner-oidc-trust' ($(if ($ok) { 'PASS' } else { 'FAIL' })) "GitHub OIDC provider + sts.amazonaws.com audience: $ok"
} catch { Add-Verdict 'runner-oidc-trust' 'INCONCLUSIVE' $_.Exception.Message }

$results | Format-Table -AutoSize -Wrap
if ($results.Verdict -contains 'FAIL') { Write-Host 'OVERALL: FAIL' -ForegroundColor Red; exit 2 }
if ($results.Verdict -contains 'INCONCLUSIVE') {
    Write-Host 'OVERALL: INCONCLUSIVE - not evidence of correctness or of a defect. Re-run with an authorized read-only inspection identity.' -ForegroundColor Yellow
    exit 3
}
Write-Host 'OVERALL: PASS (static policy chain). Live proof still requires the OIDC workflow run.' -ForegroundColor Green
exit 0
