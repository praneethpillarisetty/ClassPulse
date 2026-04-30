import { DEFAULT_SETTINGS, STORAGE_KEYS, normalizeBaseUrl } from './utils.js';
import { startCanvasOAuth, disconnectCanvas } from './auth.js';

const baseUrlEl = document.getElementById('baseUrl');
const tokenEl = document.getElementById('token');
const statusEl = document.getElementById('status');
const dueTodayEl = document.getElementById('dueToday');
const dueTomorrowEl = document.getElementById('dueTomorrow');
const in3DaysEl = document.getElementById('in3Days');
const connStatusEl = document.getElementById('connStatus');

init();

async function init() {
  const d = await chrome.storage.local.get([STORAGE_KEYS.SETTINGS, STORAGE_KEYS.AUTH]);
  const s = d[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
  baseUrlEl.value = s.baseUrl || '';
  tokenEl.value = s.token || '';
  dueTodayEl.checked = s.reminderWindows?.today ?? true;
  dueTomorrowEl.checked = s.reminderWindows?.tomorrow ?? true;
  in3DaysEl.checked = s.reminderWindows?.in3Days ?? true;
  connStatusEl.textContent = d[STORAGE_KEYS.AUTH] ? `Connected (${d[STORAGE_KEYS.AUTH].mode})` : 'Not connected';

  document.getElementById('connectBtn').onclick = connect;
  document.getElementById('disconnectBtn').onclick = disconnect;
  document.getElementById('saveManualBtn').onclick = saveManual;
}

async function connect() {
  try {
    statusEl.textContent = 'Opening Canvas authorization…';
    await startCanvasOAuth({ baseUrl: baseUrlEl.value });
    statusEl.textContent = 'Canvas connected.';
    init();
  } catch (e) {
    statusEl.textContent = e.message;
  }
}

async function disconnect() {
  await disconnectCanvas();
  statusEl.textContent = 'Disconnected.';
  init();
}

async function saveManual() {
  const settings = {
    baseUrl: normalizeBaseUrl(baseUrlEl.value),
    token: tokenEl.value.trim(),
    darkMode: false,
    reminderWindows: {
      today: dueTodayEl.checked,
      tomorrow: dueTomorrowEl.checked,
      in3Days: in3DaysEl.checked
    }
  };

  await chrome.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: settings,
    [STORAGE_KEYS.AUTH]: {
      mode: 'manual_token',
      canvasBaseUrl: settings.baseUrl,
      accessToken: settings.token,
      connectedAt: new Date().toISOString()
    }
  });
  statusEl.textContent = 'Manual token saved.';
}
