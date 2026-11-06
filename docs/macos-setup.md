# macOS Setup

Use macOS 13 or newer with the Terminal app. Run each step, then
confirm the version command prints a version number.

## 1. Node.js LTS

1. Download the **LTS** installer (`.pkg`) from <https://nodejs.org/>.
2. Run it with default options.
3. Open a **new** Terminal window and confirm:

``` bash
node --version
npm --version
```

## 2. Git

Git ships with the Xcode Command Line Tools:

``` bash
xcode-select --install
git --version
```

## 3. Visual Studio Code (recommended)

1. Install from <https://code.visualstudio.com/>.
2. In VS Code, open the Command Palette and run
   **Shell Command: Install 'code' command in PATH**.
3. Install the **Playwright Test for VS Code** extension.

## 4. Validate

From the kit's root folder:

``` bash
bash scripts/verify-environment.sh
```

## Next steps

- All green: [Lab 0 Guide](lab-0-guide.md)
- Something failed: [Troubleshooting](troubleshooting.md)
