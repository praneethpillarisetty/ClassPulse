import {
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
  buildReminderKey,
  getDeadlineWindow,
  sortAssignmentsByDueDate
} from './utils.js';
import {
  fetchActiveCourses,
  fetchCourseAssignments,
  fetchCurrentUser,
  fetchSubmission
} from './canvasApi.js';

const SYNC_ALARM = 'classpulse-sync-alarm';

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaults();
  await scheduleSyncAlarm();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureDefaults();
  await scheduleSyncAlarm();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === SYNC_ALARM) {
    await syncCanvasData({ triggerNotifications: true });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'SYNC_NOW') {
    syncCanvasData({ triggerNotifications: true })
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
  return false;
});

async function ensureDefaults() {
  const { [STORAGE_KEYS.SETTINGS]: settings } = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  if (!settings) {
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS });
  }
}

async function scheduleSyncAlarm() {
  await chrome.alarms.create(SYNC_ALARM, { periodInMinutes: 30 });
}

async function syncCanvasData({ triggerNotifications = false } = {}) {
  const { [STORAGE_KEYS.SETTINGS]: settings = DEFAULT_SETTINGS } = await chrome.storage.local.get(
    STORAGE_KEYS.SETTINGS
  );

  if (!settings.baseUrl || !settings.token) {
    throw new Error('Please configure Canvas base URL and token in ClassPulse Options.');
  }

  const apiConfig = { baseUrl: settings.baseUrl, token: settings.token };
  const user = await fetchCurrentUser(apiConfig);
  const courses = await fetchActiveCourses(apiConfig);

  const assignments = [];

  for (const course of courses) {
    const courseAssignments = await fetchCourseAssignments(course.id, apiConfig);
    for (const assignment of courseAssignments) {
      let submission = null;
      try {
        submission = await fetchSubmission(course.id, assignment.id, apiConfig);
      } catch (error) {
        console.warn('Failed to fetch submission status', assignment.id, error);
      }

      assignments.push({
        id: assignment.id,
        courseId: course.id,
        courseName: course.name,
        name: assignment.name,
        dueAt: assignment.due_at,
        htmlUrl: assignment.html_url,
        pointsPossible: assignment.points_possible,
        submissionStatus: submission?.workflow_state || 'unsubmitted',
        submittedAt: submission?.submitted_at || null,
        workflowState: assignment.workflow_state,
        reminderFlags: {}
      });
    }
  }

  const sortedAssignments = sortAssignmentsByDueDate(assignments);

  await chrome.storage.local.set({
    [STORAGE_KEYS.USER]: user,
    [STORAGE_KEYS.ASSIGNMENTS]: sortedAssignments,
    [STORAGE_KEYS.LAST_SYNC_AT]: new Date().toISOString()
  });

  if (triggerNotifications) {
    await sendDueNotifications(sortedAssignments, settings.reminderWindows || DEFAULT_SETTINGS.reminderWindows);
  }

  return { assignmentsCount: sortedAssignments.length };
}

async function sendDueNotifications(assignments, reminderWindows) {
  const { [STORAGE_KEYS.NOTIFICATIONS_SENT]: notificationsSent = {} } = await chrome.storage.local.get(
    STORAGE_KEYS.NOTIFICATIONS_SENT
  );
  const nextNotifications = { ...notificationsSent };

  for (const assignment of assignments) {
    if (!assignment.dueAt || assignment.submissionStatus === 'submitted') continue;

    const window = getDeadlineWindow(assignment.dueAt);
    const shouldNotify =
      (window === 'due_today' && reminderWindows.today) ||
      (window === 'due_tomorrow' && reminderWindows.tomorrow) ||
      (window === 'due_in_3_days' && reminderWindows.in3Days);

    if (!shouldNotify) continue;

    const reminderKey = buildReminderKey(assignment.id, window);
    if (nextNotifications[reminderKey]) continue;

    await chrome.notifications.create(`classpulse-${reminderKey}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/classpulse.svg'),
      title: `ClassPulse: ${assignment.name}`,
      message: `${assignment.courseName} is ${window.replaceAll('_', ' ')}.`,
      priority: 1
    });

    nextNotifications[reminderKey] = new Date().toISOString();
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.NOTIFICATIONS_SENT]: nextNotifications });
}
