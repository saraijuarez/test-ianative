#!/usr/bin/env bash
# =============================================================================
# verify-environment.sh — read-only Lab 0 environment validator (macOS/Linux)
#
# Checks the tools and network access the course needs. It NEVER installs,
# changes, or deletes anything: it only runs version commands and HTTPS
# reachability probes, then prints a PASS/WARN/FAIL summary.
#
# Usage:   bash scripts/verify-environment.sh
# Exit:    0 = all required checks passed, 1 = at least one FAIL
# =============================================================================
set -u

MIN_NODE_MAJOR=20          # Minimum Node.js major supported by Playwright
FAILS=0
WARNS=0

pass() { printf '  [PASS] %s\n' "$1"; }
warn() { printf '  [WARN] %s\n' "$1"; WARNS=$((WARNS + 1)); }
fail() { printf '  [FAIL] %s\n' "$1"; FAILS=$((FAILS + 1)); }

echo "AI-Native Test Automation — environment check"
echo "OS: $(uname -s) $(uname -m)"
echo

# --- Tools -------------------------------------------------------------------
echo "Tools"

# Node.js: required, and must meet the minimum major version.
if command -v node >/dev/null 2>&1; then
  NODE_VERSION="$(node --version 2>/dev/null)"           # e.g. v22.11.0
  NODE_MAJOR="${NODE_VERSION#v}"; NODE_MAJOR="${NODE_MAJOR%%.*}"
  if [ "${NODE_MAJOR:-0}" -ge "$MIN_NODE_MAJOR" ] 2>/dev/null; then
    pass "Node.js $NODE_VERSION"
  else
    fail "Node.js $NODE_VERSION is too old (need v$MIN_NODE_MAJOR or newer)"
  fi
else
  fail "Node.js not found (install the LTS release)"
fi

# npm and npx ship with Node.js; checked separately to catch broken installs.
if command -v npm >/dev/null 2>&1; then pass "npm $(npm --version 2>/dev/null)"
else fail "npm not found (reinstall Node.js LTS)"; fi

if command -v npx >/dev/null 2>&1; then pass "npx available"
else fail "npx not found (reinstall Node.js LTS)"; fi

# Git: required to clone the kit and push to GitHub.
if command -v git >/dev/null 2>&1; then pass "$(git --version 2>/dev/null)"
else fail "Git not found"; fi

# VS Code CLI: recommended, not required.
if command -v code >/dev/null 2>&1; then pass "VS Code CLI (code) available"
else warn "VS Code 'code' command not found (optional — see the setup guide)"; fi

echo

# --- Network -----------------------------------------------------------------
# Any HTTP response means the host is reachable; only "no response" fails.
echo "Network"
if command -v curl >/dev/null 2>&1; then
  check_host() {
    local url="$1" purpose="$2" code
    code="$(curl -s -o /dev/null -I --max-time 10 -w '%{http_code}' "$url" 2>/dev/null)"
    if [ -n "$code" ] && [ "$code" != "000" ]; then
      pass "$url reachable ($purpose)"
    else
      fail "$url unreachable ($purpose)"
    fi
  }
  check_host "https://registry.npmjs.org/"  "npm install / npm ci"
  check_host "https://cdn.playwright.dev/"  "browser download"
  check_host "https://playwright.dev/"      "example tests"
  check_host "https://github.com/"          "clone and push"
else
  warn "curl not found — network checks skipped"
fi

echo
echo "Summary: $FAILS failed, $WARNS warning(s)"
if [ "$FAILS" -gt 0 ]; then
  echo "Fix the FAIL items first — see docs/troubleshooting.md"
  exit 1
fi
echo "Environment ready for Lab 0."
exit 0
