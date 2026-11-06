<#
=============================================================================
 verify-environment.ps1 — read-only Lab 0 environment validator (Windows)

 Checks the tools and network access the course needs. It NEVER installs,
 changes, or deletes anything: it only runs version commands and HTTPS
 reachability probes, then prints a PASS/WARN/FAIL summary.

 Usage:   powershell -ExecutionPolicy Bypass -File scripts\verify-environment.ps1
 Exit:    0 = all required checks passed, 1 = at least one FAIL
=============================================================================
#>
$ErrorActionPreference = 'Continue'

$MinNodeMajor = 20      # Minimum Node.js major supported by Playwright
$script:Fails = 0
$script:Warns = 0

function Pass($msg) { Write-Host "  [PASS] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "  [WARN] $msg" -ForegroundColor Yellow; $script:Warns++ }
function Fail($msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red; $script:Fails++ }
function Has($cmd)  { [bool](Get-Command $cmd -ErrorAction SilentlyContinue) }

Write-Host "AI-Native Test Automation - environment check"
Write-Host "OS: $([System.Environment]::OSVersion.VersionString)"
Write-Host ""

# --- Tools -------------------------------------------------------------------
Write-Host "Tools"

# Node.js: required, and must meet the minimum major version.
if (Has 'node') {
    $nodeVersion = (node --version).Trim()              # e.g. v22.11.0
    $nodeMajor   = [int]($nodeVersion.TrimStart('v').Split('.')[0])
    if ($nodeMajor -ge $MinNodeMajor) { Pass "Node.js $nodeVersion" }
    else { Fail "Node.js $nodeVersion is too old (need v$MinNodeMajor or newer)" }
} else { Fail "Node.js not found (install the LTS release)" }

# npm and npx ship with Node.js; checked separately to catch broken installs.
if (Has 'npm') { Pass "npm $((npm --version).Trim())" } else { Fail "npm not found (reinstall Node.js LTS)" }
if (Has 'npx') { Pass "npx available" }                  else { Fail "npx not found (reinstall Node.js LTS)" }

# Git: required to clone the kit and push to GitHub.
if (Has 'git') { Pass "$((git --version).Trim())" } else { Fail "Git not found" }

# VS Code CLI: recommended, not required.
if (Has 'code') { Pass "VS Code CLI (code) available" }
else { Warn "VS Code 'code' command not found (optional - see the setup guide)" }

Write-Host ""

# --- Network -----------------------------------------------------------------
# Any HTTP response (even 4xx) means the host is reachable; only no response fails.
Write-Host "Network"
function Test-Host($url, $purpose) {
    try {
        Invoke-WebRequest -Uri $url -Method Head -TimeoutSec 10 -UseBasicParsing | Out-Null
        Pass "$url reachable ($purpose)"
    } catch {
        if ($_.Exception.Response) { Pass "$url reachable ($purpose)" }
        else { Fail "$url unreachable ($purpose)" }
    }
}
Test-Host 'https://registry.npmjs.org/' 'npm install / npm ci'
Test-Host 'https://cdn.playwright.dev/' 'browser download'
Test-Host 'https://playwright.dev/'     'example tests'
Test-Host 'https://github.com/'         'clone and push'

Write-Host ""
Write-Host "Summary: $script:Fails failed, $script:Warns warning(s)"
if ($script:Fails -gt 0) {
    Write-Host "Fix the FAIL items first - see docs/troubleshooting.md"
    exit 1
}
Write-Host "Environment ready for Lab 0."
exit 0
