import { DEFAULT_SETTINGS, STORAGE_KEYS, normalizeBaseUrl } from './utils.js';
import { fetchCurrentUser } from './canvasApi.js';

const baseUrlEl = document.getElementById('baseUrl');
const tokenEl = document.getElementById('token');
const dueTodayEl = document.getElementById('dueToday');
const dueTomorrowEl = document.getElementById('dueTomorrow');
const in3DaysEl = document.getElementById('in3Days');
const saveBtnEl = document.getElementById('saveBtn');
const testBtnEl = document.getElementById('testBtn');
const statusEl = document.getElementById('status');

init();

async function init() {
  await loadSettings();
  saveBtnEl.addEventListener('click', saveSettings);
  testBtnEl.addEventListener('click', testConnection);
}

async function loadSettings() {
  const { [STORAGE_KEYS.SETTINGS]: settings = DEFAULT_SETTINGS } = await chrome.storage.local.get(
    STORAGE_KEYS.SETTINGS
  );

  baseUrlEl.value = settings.baseUrl || '';
  tokenEl.value = settings.token || '';
  dueTodayEl.checked = settings.reminderWindows?.today ?? true;
  dueTomorrowEl.checked = settings.reminderWindows?.tomorrow ?? true;
  in3DaysEl.checked = settings.reminderWindows?.in3Days ?? true;
}

async function saveSettings() {
  const settings = readFormSettings();
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
  statusEl.textContent = 'Settings saved.';
}

async function testConnection() {
  const settings = readFormSettings();
  statusEl.textContent = 'Testing connection…';

  try {
    const user = await fetchCurrentUser({ baseUrl: settings.baseUrl, token: settings.token });
    statusEl.textContent = `Connected as ${user.name}`;
  } catch (error) {
    statusEl.textContent = `Connection failed: ${error.message}`;
  }
}

function readFormSettings() {
  return {
    baseUrl: normalizeBaseUrl(baseUrlEl.value),
    token: tokenEl.value.trim(),
    reminderWindows: {
      today: dueTodayEl.checked,
      tomorrow: dueTomorrowEl.checked,
      in3Days: in3DaysEl.checked
    }
  };
}
