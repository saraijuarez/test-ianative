# Environment Checklist

Complete this checklist before Lab 0. Every item marked **Required**
must pass; the validator script checks most of them for you.

## Required tools

- [ ] **Node.js LTS** (v20 or newer) — includes `npm` and `npx`
- [ ] **Git** — to clone the kit and push to GitHub
- [ ] **GitHub account** — to run the CI pipeline in your own repository

## Recommended tools

- [ ] **Visual Studio Code** with the `code` command on your `PATH`
- [ ] **Playwright Test for VS Code** extension

## Required network access

| Host | Used for |
| --- | --- |
| `registry.npmjs.org` | `npm init playwright`, `npm ci` |
| `cdn.playwright.dev` | `npx playwright install` (browser download) |
| `playwright.dev` | the example tests |
| `github.com` | clone and push |

## Run the validator

The validators are read-only: they never install or change anything.

macOS / Linux:

``` bash
bash scripts/verify-environment.sh
```

Windows (PowerShell):

``` powershell
powershell -ExecutionPolicy Bypass -File scripts\verify-environment.ps1
```

Expected result: `Summary: 0 failed`. A `[WARN]` for VS Code is fine.

## Next steps

- Setup help: [Windows](windows-setup.md) · [macOS](macos-setup.md)
- Something failed: [Troubleshooting](troubleshooting.md)
- All green: [Lab 0 Guide](lab-0-guide.md)
