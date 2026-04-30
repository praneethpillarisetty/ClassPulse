# ClassPulse (Chrome Extension MV3)

ClassPulse is a Canvas LMS student extension with a secure **Connect Canvas** flow and a manual token fallback.

## Why silent auto-login is not allowed

ClassPulse does **not** scrape cookies, read Canvas session tokens, or silently log users in. Those patterns are unsafe and violate user trust and common extension security expectations.

## How Canvas OAuth works in ClassPulse

1. Student enters Canvas base URL (example: `https://school.instructure.com`).
2. ClassPulse opens `https://<canvas>/login/oauth2/auth` using `chrome.identity.launchWebAuthFlow`.
3. Request includes `client_id`, `response_type=code`, `redirect_uri`, and `state`.
4. After user consent, Canvas redirects to the extension redirect URL with an authorization `code`.
5. Code is exchanged for a token **only** if secure token exchange is configured.

## Why a Canvas Developer Key may be required

Canvas OAuth typically needs an institution-managed Developer Key (`client_id`, usually with secure secret handling). If unavailable, ClassPulse shows a clear message and keeps manual access token mode available.

## Manual token fallback

In Options:
- Add Canvas URL
- Paste access token
- Save manual mode

ClassPulse stores auth state in `chrome.storage.local` and uses it for sync/notifications.

## Local testing (unpacked)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select this folder.
4. Open ClassPulse Options and connect using OAuth placeholder flow or manual token.
5. Use popup **Sync** to fetch assignments.

## Files

- `manifest.json` MV3 config and permissions.
- `auth.js` OAuth architecture + placeholders.
- `background.js` scheduled sync and reminders.
- `popup.*` dashboard + onboarding UX.
- `options.*` connection management and privacy.
- `canvasApi.js` Canvas API calls.
- `content.*` in-page assignment context card.
