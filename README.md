# 紙感儀表 · Paper Dashboard

A Google Apps Script Web App that renders a single-screen dashboard combining 中央氣象局 (CWA) weather, today's Google Calendar events, and a countdown list pulled from Google Sheets. Designed as a 736×414 paper-style canvas suitable for an always-on small display (e.g. a tablet or kiosk).

<img width="1644" height="933" alt="image" src="https://github.com/user-attachments/assets/7430641e-3c28-4b32-8e98-b324fb850945" />


### Stop Starting AI Coding from Scratch

Let AI Agents handle Google Apps Script integration and development.

This project demonstrates how to turn an unused device into a personal desktop Dashboard with AI, using Claude Design & Claude Code to design, implement, and deploy a Google Apps Script-powered application.

Full implementation article: https://zhgchg.li/posts/35cc65327d28/

## What it shows

- **天氣 / Weather** — CWA `F-C0032-001` 36-hour forecast, 3 × 12-hour blocks (Wx, PoP, MinT/MaxT, CI). Default location: 臺北市.
- **行事曆 / Calendar** — Today's events from the deployer's Google Calendar (default: `primary`). Highlights the ongoing or next-up event with minutes-remaining.
- **倒數日 / D-Day** — Reads `title, date, repeat` from a Google Sheet. `repeat=yes` rows are treated as yearly anniversaries and additionally show "已過 X 年 Y 月" (floor).

## Architecture

| File | Purpose |
|---|---|
| `Code.gs` | `doGet` router: HTML dashboard (default), `?api=1&action=data&token=...` JSON endpoint |
| `Auth.gs` | Constant-time token check against `ACCESS_TOKEN` |
| `Config.gs` | `PropertiesService` getters + `setupConfig()` to seed defaults and report missing keys |
| `Weather.gs` | CWA fetch → 3-block transform, cached 10 min |
| `Calendar.gs` | `CalendarApp.getEventsForDay`, status (ongoing/upcoming/later) + remaining minutes |
| `Countdown.gs` | Sheet read by ID + GID, yearly recurrence math, cached 5 min |
| `Index.html` | React 18 (Babel-in-browser) UI; talks to backend via `google.script.run` |
| `appsscript.json` | Manifest: timezone, OAuth scopes, web-app access mode |
| `Design/Paper Dashboard.html` | Static hi-fi prototype kept for visual reference (excluded from `clasp push` via `.claspignore`) |

The Web App is deployed `ANYONE_ANONYMOUS` and gated by a custom `ACCESS_TOKEN` stored in `PropertiesService`. The frontend reads `?token=` from the URL once, persists it to `localStorage`, and strips it from the address bar.

## Setup

### 1. Prerequisites

- Node.js 18+ and [`clasp`](https://github.com/google/clasp) (`npm i -g @google/clasp`)
- A Google account
- A CWA Open Data API key — register at https://opendata.cwa.gov.tw/
- A Google Sheet with columns `title`, `date`, `repeat` (header row required; `repeat=yes` for yearly recurring rows)

### 2. Clone & bind

```bash
git clone <this repo>
cd GASDashboardExample

# Create your own Apps Script project and bind to it
clasp login
clasp create --title "Paper Dashboard" --type webapp
# This generates a fresh .clasp.json with your own scriptId.
# (Alternatively: cp .clasp.json.example .clasp.json and fill in an existing scriptId.)
```

### 3. First push

```bash
clasp push -f
clasp open
```

In the Apps Script editor, run `setupConfig` once. Approve the OAuth consent (Calendar, Sheets, External requests). The function logs which `PropertiesService` keys are still missing.

### 4. Fill in PropertiesService

In **Project Settings → Script Properties**, set:

| Key | Value |
|---|---|
| `ACCESS_TOKEN` | A random token you choose (clients must present this to read data) |
| `CWA_API_KEY` | Your CWA Open Data Authorization key (`CWA-XXXXXXXX-...`) |
| `COUNTDOWN_SHEET_ID` | The Sheet ID (the part between `/d/` and `/edit` in the Sheet URL) |
| `COUNTDOWN_SHEET_GID` | The numeric `gid=` value of the tab to read (default `0`) |
| `WEATHER_LOCATION` | (optional) CWA `locationName`, default `臺北市` |
| `CALENDAR_ID` | (optional) Calendar ID, default `primary` |

### 5. Deploy

In the editor: **Deploy → New deployment → Web app**. Set:
- 執行身分 / Execute as: **Me**
- 誰可以存取 / Who has access: **Anyone**

Copy the `/exec` URL. Open it with `?token=<ACCESS_TOKEN>` once — the token is saved to `localStorage` and the URL bar is cleaned up automatically.

For subsequent updates after the first deployment exists, `clasp push -f && clasp deploy -i <deploymentId>` will roll out a new version under the same URL.

## Sheet shape (倒數日)

```
title        | date        | repeat
生日         | 1994-07-18  | yes
日本行       | 2026-12-12  |
```

`repeat` is case-insensitive; only `yes` activates yearly recurrence. The date column accepts native Sheet dates or `yyyy-MM-dd` / `yyyy/MM/dd` strings.

## License

MIT.
