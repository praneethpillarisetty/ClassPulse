import { STORAGE_KEYS, normalizeBaseUrl } from './utils.js';

const OAUTH_CLIENT_ID = 'CANVAS_CLIENT_ID_PLACEHOLDER';
const OAUTH_CLIENT_SECRET = '';

export function hasOAuthClientConfig() {
  return OAUTH_CLIENT_ID && OAUTH_CLIENT_ID !== 'CANVAS_CLIENT_ID_PLACEHOLDER';
}

export async function startCanvasOAuth({ baseUrl }) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  if (!normalizedBaseUrl) throw new Error('Please enter a valid Canvas base URL.');

  if (!hasOAuthClientConfig()) {
    throw new Error(
      'Canvas OAuth requires a registered Developer Key (client_id). Add your institution client_id in auth.js or use manual token fallback.'
    );
  }

  const redirectUri = chrome.identity.getRedirectURL('canvas');
  const state = crypto.randomUUID();
  const authUrl = new URL('/login/oauth2/auth', normalizedBaseUrl);
  authUrl.searchParams.set('client_id', OAUTH_CLIENT_ID);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);

  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true
  });

  if (!responseUrl) throw new Error('Canvas authorization did not return a response.');

  const parsed = new URL(responseUrl);
  const code = parsed.searchParams.get('code');
  const returnedState = parsed.searchParams.get('state');
  const oauthError = parsed.searchParams.get('error');

  if (oauthError) throw new Error(`Canvas authorization failed: ${oauthError}`);
  if (!code) throw new Error('Missing authorization code from Canvas redirect.');
  if (state !== returnedState) throw new Error('State check failed. Please try again.');

  const tokenResponse = await exchangeCodeForToken({ normalizedBaseUrl, code, redirectUri });

  const authState = {
    mode: 'oauth',
    canvasBaseUrl: normalizedBaseUrl,
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token || '',
    expiresAt: tokenResponse.expires_in
      ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
      : null,
    connectedAt: new Date().toISOString()
  };

  await chrome.storage.local.set({ [STORAGE_KEYS.AUTH]: authState });
  return authState;
}

async function exchangeCodeForToken({ normalizedBaseUrl, code, redirectUri }) {
  if (!OAUTH_CLIENT_SECRET) {
    throw new Error(
      'Authorization code received, but token exchange is unavailable. Canvas OAuth token exchange requires a secure backend/client secret. Use manual token fallback or configure backend exchange.'
    );
  }

  const response = await fetch(`${normalizedBaseUrl}/login/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
      redirect_uri: redirectUri,
      code
    })
  });

  if (!response.ok) {
    throw new Error(`OAuth token exchange failed (${response.status}).`);
  }

  return response.json();
}

export async function disconnectCanvas() {
  await chrome.storage.local.remove([STORAGE_KEYS.AUTH, STORAGE_KEYS.USER, STORAGE_KEYS.ASSIGNMENTS]);
}
