export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  AUTH: 'authState',
  USER: 'canvasUser',
  ASSIGNMENTS: 'assignments',
  LAST_SYNC_AT: 'lastSyncAt',
  NOTIFICATIONS_SENT: 'notificationsSent',
  CHECKLISTS: 'checklists',
  PLANNED: 'plannedAssignments'
};

export const DEFAULT_SETTINGS = {
  baseUrl: '',
  token: '',
  darkMode: false,
  reminderWindows: { today: true, tomorrow: true, in3Days: true }
};

export function normalizeBaseUrl(baseUrl) { return baseUrl ? baseUrl.trim().replace(/\/+$/, '') : ''; }
export function safeDate(dateLike) { const d = dateLike ? new Date(dateLike) : null; return d && !Number.isNaN(d.getTime()) ? d : null; }
export function formatDateTime(dateLike) { const d = safeDate(dateLike); return d ? new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}).format(d) : 'No due date'; }
export function sortAssignmentsByDueDate(assignments=[]) { return [...assignments].sort((a,b)=>(safeDate(a.dueAt)?.getTime()??Number.MAX_SAFE_INTEGER)-(safeDate(b.dueAt)?.getTime()??Number.MAX_SAFE_INTEGER)); }
export function buildReminderKey(assignmentId, window) { return `${assignmentId}:${window}`; }
export function getDeadlineWindow(dueAt) {
  const due = safeDate(dueAt); if (!due) return 'no_due_date';
  const now = new Date();
  const today = new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
  const dayAfter = new Date(tomorrow); dayAfter.setDate(dayAfter.getDate()+1);
  const in3 = new Date(today); in3.setDate(in3.getDate()+3);
  const in4 = new Date(today); in4.setDate(in4.getDate()+4);
  if (due < now) return 'overdue';
  if (due>=today && due<tomorrow) return 'due_today';
  if (due>=tomorrow && due<dayAfter) return 'due_tomorrow';
  if (due>=in3 && due<in4) return 'due_in_3_days';
  return 'upcoming';
}
export function statusBadge(a){ if(a.submissionStatus==='submitted') return {label:'Submitted',type:'submitted'}; if(getDeadlineWindow(a.dueAt)==='overdue') return {label:'Overdue',type:'overdue'}; if(getDeadlineWindow(a.dueAt)==='due_today') return {label:'Due Today',type:'today'}; return {label:'Upcoming',type:'upcoming'}; }
