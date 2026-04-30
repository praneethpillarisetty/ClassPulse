import { fetchAssignments, fetchCourses, fetchCurrentUser } from './canvasApi.js';
import { ensureDefaults, getMany, setMany } from './storage.js';
import { runReminderCheck } from './reminders.js';
import { DEFAULT_SETTINGS, STORAGE_KEYS, courseColor, nowIso, safeDate } from './utils.js';

const SYNC='classpulse-sync'; const REM='classpulse-reminders';
chrome.runtime.onInstalled.addListener(init); chrome.runtime.onStartup.addListener(init);
async function init(){ await ensureDefaults(); const s=(await getMany([STORAGE_KEYS.SETTINGS]))[STORAGE_KEYS.SETTINGS]||DEFAULT_SETTINGS; chrome.alarms.create(SYNC,{periodInMinutes:s.syncIntervalMinutes||30}); chrome.alarms.create(REM,{periodInMinutes:15}); }
chrome.alarms.onAlarm.addListener(async(a)=>{if(a.name===SYNC) await syncCanvasData(); if(a.name===REM){const d=await getMany([STORAGE_KEYS.ASSIGNMENTS,STORAGE_KEYS.SETTINGS]); await runReminderCheck(d.assignments||[],d.settings||DEFAULT_SETTINGS);}});
chrome.runtime.onMessage.addListener((m,_s,send)=>{ if(m?.type==='SYNC_NOW'){syncCanvasData().then(r=>send({ok:true,result:r})).catch(e=>send({ok:false,error:e.message})); return true;} });
chrome.notifications.onClicked.addListener(async(id)=>{const key=id.replace('classpulse-',''); const d=await getMany([STORAGE_KEYS.NOTIFICATIONS_SENT]); const url=d.notificationsSent?.[key]?.url; if(url) chrome.tabs.create({url});});

export async function syncCanvasData(){
  const d=await getMany([STORAGE_KEYS.AUTH,STORAGE_KEYS.SETTINGS]); const auth=d.authState; const settings={...DEFAULT_SETTINGS,...(d.settings||{})};
  if(!auth?.canvasBaseUrl||!auth?.accessToken) throw new Error('Canvas URL or token missing');
  const cfg={baseUrl:auth.canvasBaseUrl,token:auth.accessToken}; const user=await fetchCurrentUser(cfg);
  const coursesRaw=await fetchCourses(cfg);
  const now=Date.now();
  const courseData=[]; const assignments=[];
  for(const c of coursesRaw){
    const end=safeDate(c.end_at)?.getTime(); const termEnd=safeDate(c.term?.end_at)?.getTime();
    const available=c.workflow_state==='available' && !c.access_restricted_by_date && (!end||end>now) && (!termEnd||termEnd>now);
    const course={id:c.id,name:c.name||'Untitled Course',color:courseColor(c),available};
    const raws=await fetchAssignments(c.id,cfg);
    const items=raws.map(a=>({id:a.id,courseId:c.id,courseName:course.name,courseColor:course.color,name:a.name||'Untitled Assignment',dueAt:a.due_at,pointsPossible:a.points_possible,htmlUrl:a.html_url||a.url||'',submitted:!!a.submission?.submitted_at,locked:!!a.locked_for_user,published:a.published!==false})).filter(a=>{
      if((a.locked||!a.published)) return false;
      if(!a.dueAt&&!settings.showUndatedAssignments) return false;
      const due=safeDate(a.dueAt)?.getTime();
      if(due&&due<now){ if(settings.showOverdue24h && now-due<=24*3600e3) return true; return false; }
      return true;
    });
    if(settings.showInactiveCourses|| (available && items.some(i=>!i.submitted && (!i.dueAt || safeDate(i.dueAt)?.getTime()>=now)))){courseData.push(course); assignments.push(...items);}
  }
  await setMany({[STORAGE_KEYS.USER]:user,[STORAGE_KEYS.COURSES]:courseData,[STORAGE_KEYS.ASSIGNMENTS]:assignments,[STORAGE_KEYS.LAST_SYNC_AT]:nowIso()});
  await runReminderCheck(assignments,settings);
  return {courses:courseData.length,assignments:assignments.length};
}
