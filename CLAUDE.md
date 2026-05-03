# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This is an **early-stage Google Apps Script (GAS) project** managed with [clasp](https://github.com/google/clasp). The Apps Script side has no `.gs`/`.js` source yet — only project config (`appsscript.json`, `.clasp.json`) and a standalone HTML design prototype under `Design/`. Expect new work to be the *first* implementation, not edits to existing logic.

## Repo layout

- `appsscript.json` — Apps Script manifest. V8 runtime, timezone `America/New_York`, Stackdriver exception logging. No OAuth scopes or libraries declared yet; add them here when code starts calling Google services (`SpreadsheetApp`, `UrlFetchApp`, etc.).
- `.clasp.json` — clasp config bound to a remote Apps Script project (`scriptId`). `rootDir: ""` means `clasp push` uploads from the repo root. `.gs`, `.js`, `.html`, `.json` are all pushed; subdirectories are **not** skipped, so anything under `Design/` will also be uploaded if left in place.
- `Design/Paper Dashboard.html` — design-only hi-fi prototype (React 18 + Babel via CDN, Noto Serif TC / Source Serif 4 fonts, fixed 736×414 stage). It is a visual mockup; it does **not** call `google.script.run`, `HtmlService`, or any Apps Script API. Treat it as the **visual reference** for the dashboard UI to be built — not as code to ship.

## Common commands

clasp is the build/deploy tool. Typical flow:

```bash
clasp login                # one-time, on a new machine
clasp push                 # upload local files to the bound Apps Script project
clasp pull                 # overwrite local files with what's on Apps Script
clasp open                 # open the script in the Apps Script editor
clasp logs                 # tail Stackdriver logs
clasp deploy               # create a versioned deployment (e.g. for web app)
```

There is **no local test runner, linter, or build step** configured. Logic that must be unit-tested should be factored so it can run outside the Apps Script runtime, or tested inside the Apps Script editor.

## Things to know before pushing code

- Because `skipSubdirectories: false` and the design HTML lives at `Design/Paper Dashboard.html`, `clasp push` will upload it to the Apps Script project as an HTML file named `Design/Paper Dashboard`. If the dashboard UI is a separate file, decide whether the design file should stay in the repo (and be pushed) or be moved into a clasp-ignored path.
- The manifest currently declares no `oauthScopes`. The first time code touches a Google service, either let Apps Script infer scopes on first run or declare them explicitly in `appsscript.json` to keep the consent screen stable.
- Timezone is `America/New_York`. If date/time logic should follow the user's locale, change it here rather than scattering offset math through code.

## Working scope

Treat this repo as self-contained. Use only files inside this repository as source of truth for code, design, and conventions. Anything not in the repo (template origins, sibling projects, prior work) is out of scope — ask the user instead of inferring from elsewhere on the filesystem.
