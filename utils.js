export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  USER: 'canvasUser',
  ASSIGNMENTS: 'assignments',
  LAST_SYNC_AT: 'lastSyncAt',
  NOTIFICATIONS_SENT: 'notificationsSent',
  CHECKLISTS: 'checklists'
};

export const DEFAULT_SETTINGS = {
  baseUrl: '',
  token: '',
  reminderWindows: {
    today: true,
    tomorrow: true,
    in3Days: true
  }
};

export function normalizeBaseUrl(baseUrl) {
  if (!baseUrl) return '';
  return baseUrl.trim().replace(/\/+$/, '');
}

export function safeDate(dateLike) {
  if (!dateLike) return null;
  const date = new Date(dateLike);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(dateLike) {
  const date = safeDate(dateLike);
  if (!date) return 'No due date';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

export function getDeadlineWindow(dueAt) {
  const dueDate = safeDate(dueAt);
  if (!dueDate) return 'no_due_date';

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfDayAfterTomorrow = new Date(startOfTomorrow);
  startOfDayAfterTomorrow.setDate(startOfDayAfterTomorrow.getDate() + 1);
  const startOfIn3Days = new Date(startOfToday);
  startOfIn3Days.setDate(startOfIn3Days.getDate() + 3);
  const startOfIn4Days = new Date(startOfToday);
  startOfIn4Days.setDate(startOfIn4Days.getDate() + 4);

  if (dueDate < now) return 'overdue';
  if (dueDate >= startOfToday && dueDate < startOfTomorrow) return 'due_today';
  if (dueDate >= startOfTomorrow && dueDate < startOfDayAfterTomorrow) return 'due_tomorrow';
  if (dueDate >= startOfIn3Days && dueDate < startOfIn4Days) return 'due_in_3_days';
  return 'upcoming';
}

export function statusBadge(assignment) {
  if (assignment.submissionStatus === 'submitted') return { label: 'Submitted', type: 'submitted' };
  if (assignment.submissionStatus === 'missing') return { label: 'Missing', type: 'missing' };

  const window = getDeadlineWindow(assignment.dueAt);
  switch (window) {
    case 'due_today':
      return { label: 'Due Today', type: 'today' };
    case 'due_tomorrow':
      return { label: 'Due Tomorrow', type: 'tomorrow' };
    case 'overdue':
      return { label: 'Overdue', type: 'overdue' };
    default:
      return { label: 'Upcoming', type: 'upcoming' };
  }
}

export function sortAssignmentsByDueDate(assignments = []) {
  return [...assignments].sort((a, b) => {
    const aTime = safeDate(a.dueAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const bTime = safeDate(b.dueAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}

export function buildReminderKey(assignmentId, window) {
  return `${assignmentId}:${window}`;
}

export function isCanvasAssignmentPage(urlString) {
  try {
    const url = new URL(urlString);
    return /\/courses\/\d+\/assignments\/\d+/.test(url.pathname);
  } catch {
    return false;
  }
}

export function parseAssignmentFromUrl(urlString) {
  try {
    const url = new URL(urlString);
    const match = url.pathname.match(/\/courses\/(\d+)\/assignments\/(\d+)/);
    if (!match) return null;
    return { courseId: Number(match[1]), assignmentId: Number(match[2]) };
  } catch {
    return null;
  }
}
