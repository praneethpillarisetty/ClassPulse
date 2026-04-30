import { DEFAULT_SETTINGS, STORAGE_KEYS } from './utils.js';
import { saveManualAuth, testConnection } from './auth.js';
import { disconnectAndClear, ensureDefaults } from './storage.js';

const ids=['baseUrl','token','testResult','status','showInactiveCourses','showUndatedAssignments','showOverdue24h','notificationsEnabled','in3Days','tomorrow','today','in1Hour'];
const el=Object.fromEntries(ids.map(i=>[i,document.getElementById(i)]));
init();
async function init(){await ensureDefaults(); const d=await chrome.storage.local.get([STORAGE_KEYS.AUTH,STORAGE_KEYS.SETTINGS]); const s={...DEFAULT_SETTINGS,...(d.settings||{})}; el.baseUrl.value=d.authState?.canvasBaseUrl||''; el.token.value=d.authState?.accessToken||''; ['showInactiveCourses','showUndatedAssignments','showOverdue24h','notificationsEnabled'].forEach(k=>el[k].checked=!!s[k]); ['in3Days','tomorrow','today','in1Hour'].forEach(k=>el[k].checked=!!s.reminderWindows[k]); }
document.getElementById('testBtn').onclick=async()=>{try{const u=await testConnection(el.baseUrl.value,el.token.value); el.testResult.textContent=`Connected as ${u.name}`;}catch(e){el.testResult.textContent=e.message;}};
document.getElementById('saveBtn').onclick=async()=>{try{await saveManualAuth(el.baseUrl.value,el.token.value); const s={showInactiveCourses:el.showInactiveCourses.checked,showUndatedAssignments:el.showUndatedAssignments.checked,showOverdue24h:el.showOverdue24h.checked,notificationsEnabled:el.notificationsEnabled.checked,reminderWindows:{in3Days:el.in3Days.checked,tomorrow:el.tomorrow.checked,today:el.today.checked,in1Hour:el.in1Hour.checked}}; await chrome.storage.local.set({[STORAGE_KEYS.SETTINGS]:{...DEFAULT_SETTINGS,...s}}); await chrome.runtime.sendMessage({type:'SYNC_NOW'}); el.status.textContent='Saved and synced.';}catch(e){el.status.textContent=e.message;}};
document.getElementById('disconnectBtn').onclick=async()=>{await disconnectAndClear(); el.status.textContent='Disconnected and local data cleared.';};
