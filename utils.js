export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  AUTH: 'authState',
  USER: 'canvasUser',
  ASSIGNMENTS: 'assignments',
  COURSES: 'courses',
  LAST_SYNC_AT: 'lastSyncAt',
  NOTIFICATIONS_SENT: 'notificationsSent',
  PLANNED: 'plannedAssignments'
};

export const DEFAULT_SETTINGS = {
  showInactiveCourses: false,
  showUndatedAssignments: false,
  showOverdue24h: false,
  notificationsEnabled: true,
  reminderWindows: { in3Days: true, tomorrow: true, today: true, in1Hour: true },
  syncIntervalMinutes: 30
};

export const COURSE_PALETTE = ['#4f46e5','#0ea5e9','#f97316','#16a34a','#db2777','#7c3aed','#0891b2','#ca8a04'];

export const normalizeBaseUrl = (url='') => url.trim().replace(/\/+$/, '');
export function isValidCanvasUrl(url=''){ try{const u=new URL(normalizeBaseUrl(url)); return /^https?:$/.test(u.protocol);}catch{return false;} }
export const safeDate = (v)=>{const d=v?new Date(v):null;return d&&!Number.isNaN(d.getTime())?d:null;};
export const nowIso=()=>new Date().toISOString();
export const formatDateTime=(v)=>{const d=safeDate(v);return d?new Intl.DateTimeFormat(undefined,{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d):'No due date';};
export const hashString=(s='')=>Array.from(s).reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0,0);
export const courseColor=(course)=>COURSE_PALETTE[Math.abs(hashString(`${course.id}-${course.name}`))%COURSE_PALETTE.length];
export const buildReminderKey=(id,w)=>`${id}-${w}`;
