# ClassPulse (MV3)

Production-ready Canvas assignment dashboard Chrome extension.

## Features
- Active-course detection with Canvas filtering and old-course suppression.
- Assignment filtering (future-only, optional undated, optional 24-hour overdue view).
- Popup dashboard with search, course filter, tabs, and summary cards.
- Automatic deadline reminders via `chrome.alarms` every 15 minutes.
- Onboarding-style options page with connection test (`/api/v1/users/self`).
- Local-only privacy model: data stays in `chrome.storage.local`.

## Load unpacked
1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load unpacked and select this folder.
4. Open options, add Canvas URL + token, test, then save and sync.
