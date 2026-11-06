# Troubleshooting

Each section has a **Quick Fix** you can try in under 5 minutes. If
the Quick Fix does not work, use the recovery path at the end of the
section — don't spend the lab debugging your machine.

Start by running the validator; its `[FAIL]` lines point to the right
section below.

``` bash
bash scripts/verify-environment.sh
```

## `node`, `npm`, or `git` not found

**Symptom:** `command not found` / `is not recognized as an internal
or external command`.

**Quick Fix:**

- [ ] Close and reopen the terminal (the installer updates `PATH` for
      new windows only).
- [ ] Reinstall Node.js **LTS** or Git with default options — see
      [Windows](windows-setup.md) or [macOS](macos-setup.md).

## Node.js version too old

**Symptom:** the validator reports `Node.js vXX is too old`.

**Quick Fix:** install the current **LTS** from <https://nodejs.org/>,
then open a new terminal and run `node --version`.

## npm install fails

**Symptom:** `npm init playwright@latest` or `npm ci` fails with
`ETIMEDOUT`, `ECONNRESET`, `EACCES`, or `UNABLE_TO_GET_ISSUER_CERT`.

**Quick Fix:**

- [ ] `ETIMEDOUT` / `ECONNRESET`: retry once; then check that
      `https://registry.npmjs.org/` opens in your browser.
- [ ] `EACCES` (macOS/Linux): never use `sudo npm`. Work inside your
      home folder, not a system folder.
- [ ] Certificate errors: you are behind a corporate proxy. Ask IT for
      the correct npm proxy settings — do **not** disable SSL
      verification.

**Recovery path:** if the scaffold itself is the problem (half-created
project, broken config, confusing prompts), skip it and use the
ready-made project in [`starter/`](../starter/README.md):

``` bash
cd starter
npm ci
npx playwright install
npx playwright test
```

> `npm ci` still needs access to `registry.npmjs.org`. If the registry
> is blocked, the recovery path will fail the same way — see
> [Restricted network](#restricted-network).

## Playwright browser download fails

**Symptom:** `npx playwright install` fails with `Failed to download`,
`Download failure`, or a timeout.

**Quick Fix:**

- [ ] Retry once — large downloads sometimes drop.
- [ ] Check that `https://cdn.playwright.dev/` is reachable (the
      validator tests this).
- [ ] Linux only: install system dependencies with
      `npx playwright install --with-deps`.

**Recovery path:** if your scaffolded project is in a bad state, switch
to [`starter/`](../starter/README.md) and run the same commands as
above. The browser download is still required there, so this only
helps when the project — not the network — is the problem.

## Tests fail with `net::ERR_` or timeouts

**Symptom:** tests fail on `page.goto('https://playwright.dev/')`.

**Quick Fix:** open `https://playwright.dev/` in your browser. If it
does not load, see [Restricted network](#restricted-network).

## `git push` rejected

**Symptom:** `rejected (fetch first)` or `Authentication failed`.

**Quick Fix:**

- [ ] Create the GitHub repository **empty** (no README or license).
- [ ] Sign in when Git asks, or use the GitHub CLI / Git Credential
      Manager. Never paste passwords or tokens into project files.

## Restricted network

**Symptom:** the validator reports `unreachable` for one or more hosts,
on every attempt.

No project-level fix exists for this — neither your own project nor
the [`starter/`](../starter/README.md) recovery path can download
packages or browsers without network access.

- [ ] Switch to a different network (home Wi-Fi, mobile hotspot).
- [ ] Or ask your IT team to allow the hosts listed in the
      [Environment Checklist](environment-checklist.md#required-network-access).
