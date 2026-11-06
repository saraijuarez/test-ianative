# Lab 0 Guide — Your First Playwright Project

Goal: create a Playwright + TypeScript project, run the example tests,
and see them pass in GitHub Actions. Time: about 30 minutes.

Before you start, complete the [Environment Checklist](environment-checklist.md).

## Step 1. Create a project folder

``` bash
mkdir my-playwright-project
cd my-playwright-project
```

## Step 2. Initialize Git

``` bash
git init
```

## Step 3. Scaffold Playwright

``` bash
npm init playwright@latest
```

Answer the prompts:

- Language: **TypeScript**
- Tests folder: **tests**
- Add a GitHub Actions workflow: **Yes**
- Install Playwright browsers: **Yes**

## Step 4. Install browsers (if skipped)

If you answered **No** to the browser prompt, or the download failed:

``` bash
npx playwright install
```

> **Fallback — stuck on Step 3 or 4?**
> First try the matching Quick Fix in
> [Troubleshooting](troubleshooting.md). If `npm init playwright` or
> the browser install still fails and can't be fixed in about 5
> minutes, stop debugging and use the ready-made recovery project in
> [`starter/`](../starter/README.md):
>
> ``` bash
> cd starter
> npm ci
> npx playwright install
> npx playwright test
> ```
>
> Then publish it as described in the
> [starter README](../starter/README.md#publish-to-your-own-github-repository)
> — that replaces Steps 5–6. You lose nothing: the course rebuilds the
> framework from scratch anyway.

## Step 5. Run the tests

``` bash
npx playwright test
```

Expected: every test passes, for example `6 passed`.

Other useful commands (also available as npm scripts):

| Command | npm script |
| --- | --- |
| `npx playwright test` | `npm test` |
| `npx playwright test --ui` | `npm run test:ui` |
| `npx playwright show-report` | `npm run report` |

## Step 6. Push to GitHub

1. Create an **empty** repository on GitHub (no README, no license).
2. Connect and push:

``` bash
git add .
git commit -m "Lab 0: Playwright project"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

3. Open the **Actions** tab. The **Playwright Tests** workflow should
   start and finish green.

## Done checklist

- [ ] `npx playwright test` passes locally
- [ ] Repository pushed to your GitHub account
- [ ] **Playwright Tests** run is green in the Actions tab
