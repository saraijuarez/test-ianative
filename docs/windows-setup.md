# Windows Setup

Use Windows 10 or 11 with PowerShell. Run each step, then confirm the
version command prints a version number.

## 1. Node.js LTS

1. Download the **LTS** installer from <https://nodejs.org/>.
2. Run it with default options (keep "Add to PATH" checked).
3. Open a **new** PowerShell window and confirm:

``` powershell
node --version
npm --version
```

## 2. Git

1. Download Git for Windows from <https://git-scm.com/download/win>.
2. Install with default options.
3. Confirm:

``` powershell
git --version
```

## 3. Visual Studio Code (recommended)

1. Install from <https://code.visualstudio.com/>.
2. During setup, check **Add to PATH**.
3. Install the **Playwright Test for VS Code** extension.

## 4. Validate

From the kit's root folder:

``` powershell
powershell -ExecutionPolicy Bypass -File scripts\verify-environment.ps1
```

`-ExecutionPolicy Bypass` applies to this single run only; it does not
change your system policy.

## Next steps

- All green: [Lab 0 Guide](lab-0-guide.md)
- Something failed: [Troubleshooting](troubleshooting.md)
