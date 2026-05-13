import { DEFAULT_SETTINGS, STORAGE_KEYS } from './utils.js';
import { saveManualAuth, testConnection } from './auth.js';
import { disconnectAndClear, ensureDefaults } from './storage.js';

const ids = [
  'baseUrl','token','testResult','status','connectionBadge','notificationResult',
  'showInactiveCourses','showUndatedAssignments','showOverdue24h','notificationsEnabled','in3Days','tomorrow','today','in1Hour'
];
const el = Object.fromEntries(ids.map(i => [i, document.getElementById(i)]));

init();

async function init() {
  await ensureDefaults();
  const d = await chrome.storage.local.get([STORAGE_KEYS.AUTH, STORAGE_KEYS.SETTINGS, STORAGE_KEYS.USER]);
  const s = { ...DEFAULT_SETTINGS, ...(d.settings || {}) };
  el.baseUrl.value = d.authState?.canvasBaseUrl || '';
  el.token.value = d.authState?.accessToken || '';
  ['showInactiveCourses','showUndatedAssignments','showOverdue24h','notificationsEnabled'].forEach(k => el[k].checked = !!s[k]);
  ['in3Days','tomorrow','today','in1Hour'].forEach(k => el[k].checked = !!s.reminderWindows?.[k]);
  updateBadge(d.canvasUser?.name || (d.authState ? 'Connected' : 'Not connected'), !!d.authState);
}

document.getElementById('testBtn').onclick = async () => {
  setResult(el.testResult, 'Testing connection…');
  try {
    const u = await testConnection(el.baseUrl.value, el.token.value);
    await chrome.storage.local.set({ [STORAGE_KEYS.USER]: u });
    setResult(el.testResult, `Connected as ${u.name || 'Canvas user'} ✅`, true);
    updateBadge(u.name || 'Connected', true);
  } catch (e) {
    setResult(el.testResult, e.message || 'Connection failed', false);
    updateBadge('Connection failed', false);
  }
};

document.getElementById('saveBtn').onclick = async () => {
  setResult(el.status, 'Saving and syncing…');
  try {
    await saveManualAuth(el.baseUrl.value, el.token.value);
    const s = readSettings();
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: { ...DEFAULT_SETTINGS, ...s } });
    const r = await chrome.runtime.sendMessage({ type: 'SYNC_NOW' });
    if (!r?.ok) throw new Error(r?.error || 'Sync failed');
    setResult(el.status, `Saved and synced ${r.result?.assignments ?? 0} assignments ✅`, true);
    updateBadge('Connected', true);
  } catch (e) {
    setResult(el.status, e.message || 'Save failed', false);
  }
};

document.getElementById('disconnectBtn').onclick = async () => {
  await disconnectAndClear();
  el.baseUrl.value = '';
  el.token.value = '';
  updateBadge('Not connected', false);
  setResult(el.status, 'Disconnected and local data cleared.', true);
};

document.getElementById('testNotificationBtn').onclick = async () => {
  setResult(el.notificationResult, 'Sending…');
  try {
    await chrome.notifications.create(`classpulse-test-${Date.now()}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'ClassPulse Test',
      message: 'Notifications are working.',
      priority: 2
    });
    setResult(el.notificationResult, 'Test notification sent ✅', true);
  } catch (e) {
    setResult(el.notificationResult, e.message || 'Notification failed', false);
  }
};

function readSettings() {
  return {
    showInactiveCourses: el.showInactiveCourses.checked,
    showUndatedAssignments: el.showUndatedAssignments.checked,
    showOverdue24h: el.showOverdue24h.checked,
    notificationsEnabled: el.notificationsEnabled.checked,
    reminderWindows: {
      in3Days: el.in3Days.checked,
      tomorrow: el.tomorrow.checked,
      today: el.today.checked,
      in1Hour: el.in1Hour.checked
    }
  };
}

function updateBadge(text, ok) {
  el.connectionBadge.textContent = text;
  el.connectionBadge.classList.toggle('ok', !!ok);
}

function setResult(node, text, ok) {
  node.textContent = text;
  node.classList.remove('ok','err');
  if (ok === true) node.classList.add('ok');
  if (ok === false) node.classList.add('err');
}
