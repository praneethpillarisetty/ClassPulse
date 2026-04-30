import { STORAGE_KEYS, buildReminderKey, formatDateTime, safeDate } from './utils.js';

const WINDOWS=[{k:'in3Days',ms:72*3600e3,label:'due in 3 days'},{k:'tomorrow',ms:24*3600e3,label:'due tomorrow'},{k:'today',ms:0,label:'due today'},{k:'in1Hour',ms:3600e3,label:'due in 1 hour'}];
const tol=15*60e3;
export async function runReminderCheck(assignments,settings){
  if(!settings.notificationsEnabled) return;
  const d=await chrome.storage.local.get(STORAGE_KEYS.NOTIFICATIONS_SENT); const sent=d[STORAGE_KEYS.NOTIFICATIONS_SENT]||{};
  const now=Date.now();
  for(const a of assignments){
    const due=safeDate(a.dueAt); if(!due||a.submitted||due.getTime()<=now) continue;
    for(const w of WINDOWS){ if(!settings.reminderWindows?.[w.k]) continue;
      const target=due.getTime()-w.ms; if(Math.abs(now-target)>tol) continue;
      const key=buildReminderKey(a.id,w.k); if(sent[key]) continue;
      const message=`${a.courseName}: ${a.name} is ${w.label} at ${formatDateTime(a.dueAt)}`;
      await chrome.notifications.create(`classpulse-${key}`,{type:'basic',iconUrl:'icons/icon128.png',title:'ClassPulse Deadline Reminder',message,priority:2});
      sent[key]={at:new Date().toISOString(),url:a.htmlUrl};
    }
  }
  await chrome.storage.local.set({[STORAGE_KEYS.NOTIFICATIONS_SENT]:sent});
}
