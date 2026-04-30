# ClassPulse (Chrome Extension MV3)

ClassPulse is a student productivity extension for Canvas LMS. It helps students stay organized by syncing assignments, showing due dates and submission status, and sending reminders. It **does not** solve homework, generate assignment answers, or bypass academic integrity.

## What the extension does

- Connects to Canvas using a student-provided base URL and access token.
- Syncs active courses and upcoming assignments.
- Shows a popup dashboard with:
  - Student name
  - Sorted upcoming assignments
  - Status badges (Due Today, Due Tomorrow, Upcoming, Overdue, Submitted, Missing)
  - Search and course filter
  - Sync Now action
- Runs periodic sync using `chrome.alarms`.
- Sends reminder notifications for due windows (today/tomorrow/in 3 days).
- Avoids duplicate notifications per assignment + reminder window.
- Injects a right-side panel on Canvas assignment pages with due info and a local checklist.

## Install as an unpacked extension

1. Download or clone this folder.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this project directory.
5. Open the extension’s **Options** page and add your Canvas settings.

## How to create a Canvas access token

1. Sign in to your Canvas account in a browser.
2. Open **Account** → **Settings**.
3. Scroll to **Approved Integrations**.
4. Click **+ New Access Token**.
5. Give it a name (example: `ClassPulse`) and optionally an expiration date.
6. Copy the generated token and paste it into ClassPulse Options.

> Keep your token private. Anyone with the token can access your Canvas data according to your account permissions.

## Required permissions and why

- `storage`: Save settings, synced assignments, and checklist state locally.
- `alarms`: Periodic background sync.
- `notifications`: Due-date reminders.
- `tabs`: Open Canvas assignment links from popup cards.
- `host_permissions` (`*.instructure.com`): Call Canvas API and run content script on Canvas assignment pages.

## Privacy & security

- No external analytics.
- No third-party servers.
- No AI features.
- No homework-answer generation.
- Token and synced data are stored only in `chrome.storage.local`.

## Known limitations

- `bucket=upcoming` may omit some past assignments from API results.
- Submission status depends on Canvas permissions and course settings.
- Content panel appears only on URL patterns matching Canvas assignment pages.
- Local checklists are per-browser profile and not cross-device unless browser sync/storage policy handles it externally.

## Future features

- Per-course reminder customization.
- Calendar export (ICS).
- More robust conflict-aware schedule planning tools.
- Optional assignment timeline and weekly workload view.

