# CLAUDE.md - Open Tab Blocker

## Project Overview

Open Tab Blocker is a Chrome extension (Manifest V3) that helps users block distracting websites by organizing them into time-controlled "buckets." It includes productivity features like Focus Sessions, Break timers, and Friction Mode.

- **Version**: 1.0.5
- **License**: MIT
- **Author**: Andrew Stilliard

## Repository Structure

```
open-tab-blocker/
├── manifest.json        # Chrome extension manifest (MV3)
├── package.json         # NPM config (build tooling only)
├── background.js        # Service worker - navigation blocking logic
├── popup.html           # Extension popup UI markup
├── popup.js             # Popup UI logic and state management (largest file, ~913 lines)
├── popup.css            # Popup styling (~727 lines)
├── blocked.html         # Page shown when a site is blocked
├── blocked.js           # Blocked page dynamic content
└── icons/               # Extension icons and Chrome Web Store assets
```

## Build & Development

### Prerequisites

```bash
npm install
```

### Build

```bash
npm run build
```

This runs `web-ext build --overwrite-dest` and produces a zip in `web-ext-artifacts/` for Chrome Web Store upload.

### Local Development

Load the extension directory directly in Chrome:
1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the project root

There is no bundler or transpilation step. All source files are plain JavaScript that run directly in Chrome.

### No Tests or Linting

There are currently no test frameworks, linting tools, or CI/CD pipelines configured. There are no `.eslintrc`, `.prettierrc`, or similar config files. Code quality is maintained manually.

## Architecture

### How Blocking Works

```
User navigates to URL
  → background.js onBeforeNavigate listener fires
    → URL matched against sites in each enabled bucket
      → Time/day rules evaluated for matching bucket
        → Block: redirect to blocked.html?bucket=<name>
        → Allow: navigation proceeds normally
```

### Key Files

**`background.js`** (~167 lines) - Service worker handling all blocking logic:
- `handleNavigationChange()` — main navigation listener
- `urlMatchesSite()` — URL matching (exact hostname, subdomain, URL prefix)
- `shouldBlockForBucket()` — evaluates time periods, days, always-block, focus sessions
- `timeToMinutes()` / `isTimeInRange()` — time utilities (handles overnight ranges)
- `incrementBlockCount()` — tracks daily block attempts per bucket
- Chrome Alarms handlers for focus/break session expiry

**`popup.js`** (~913 lines) - All popup UI logic:
- Bucket CRUD (create, edit, delete, toggle)
- Site management within buckets
- Feature toggles: Friction Mode, Focus Sessions, Take a Break, Block Counts, Unlock History
- Tab navigation (Manage, Add, Settings, History)
- Session countdown timers (1-second intervals)
- Friction challenge modal (random sentence typing)

**`blocked.html` / `blocked.js`** - Static blocked page with dynamic content populated from storage.

**`popup.html` / `popup.css`** - Single-page popup UI with tab-based navigation.

### Data Storage

All data uses `chrome.storage.sync` (syncs across user's Chrome devices). Key data structures:

```javascript
// Bucket
{
  name: string,
  enabled: boolean,
  alwaysBlock: boolean,
  startTime: "HH:MM" | null,   // Time period 1
  endTime: "HH:MM" | null,
  startTime2: "HH:MM" | null,  // Time period 2
  endTime2: "HH:MM" | null,
  days: number[],               // 0-6, empty = every day
  sites: [{ url: string }],
  blockMessage: string
}

// Focus/Break session
{
  endTime: number,                       // ms since epoch
  previousStates: { bucketName: boolean } // restored on end
}

// Block counts (7-day rolling)
{ "YYYY-MM-DD": { "bucketName": number } }

// Unlock log entries
{ bucketName: string, disabledAt: ISO8601, enabledAt: ISO8601 | null }
```

### Chrome APIs Used

- **`chrome.webNavigation`** — intercept navigation events
- **`chrome.storage.sync`** — persist all user data
- **`chrome.tabs`** — redirect blocked navigations
- **`chrome.alarms`** — schedule focus/break session endings

## Key Features

1. **Bucket-based blocking** — group sites with shared time rules
2. **Dual time periods** — two blocking windows per bucket (e.g., morning + evening)
3. **Day-of-week selection** — block only on specific days
4. **URL path matching** — block specific paths (e.g., YouTube Shorts)
5. **Friction Mode** — require typing a random sentence to disable a bucket
6. **Focus Sessions** — Pomodoro-style timed sessions (15/25/45/60 min) that enable all buckets
7. **Take a Break** — 5-minute daily break that disables all buckets temporarily
8. **Block count tracking** — analytics on blocked attempts per bucket
9. **Unlock history** — log of when buckets were disabled/enabled with durations
10. **Custom block messages** — per-bucket messages shown on the blocked page

## Coding Conventions

- **No external runtime dependencies** — only Chrome APIs
- **Plain ES6+ JavaScript** — no TypeScript, no bundler, no framework
- **camelCase** for functions and variables
- **Template literals** for HTML generation in JS
- **`const`/`let`** throughout (no `var`)
- **Arrow functions** for callbacks and event listeners
- **Inline HTML generation** — UI elements built via string concatenation in popup.js
- **Single-file architecture** — each concern (background, popup, blocked) is one JS file
- **No module system** — all files are standalone scripts

## Important Notes for AI Assistants

- All JS files run in a Chrome extension context. `chrome.*` APIs are available globally.
- `background.js` runs as a service worker (no DOM access).
- `popup.js` runs in the popup page context (has DOM access but limited lifecycle).
- `blocked.js` runs in a regular page context.
- There is no build/transpile step — changes to source files take effect immediately after reloading the extension in Chrome.
- The `web-ext-artifacts/` and `node_modules/` directories are gitignored.
- Time handling must account for overnight ranges (e.g., 22:00-06:00 crossing midnight).
- Friction Mode intercepts paste/drop events to force manual typing.
- Focus and Break sessions save and restore previous bucket states on completion.
