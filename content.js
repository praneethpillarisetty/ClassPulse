(async function initContentPanel() {
  const assignmentRef = parseAssignmentFromUrl(window.location.href);
  if (!assignmentRef) return;

  const data = await chrome.storage.local.get(['assignments', 'checklists']);
  const assignments = data.assignments || [];
  const checklists = data.checklists || {};

  const assignment = assignments.find(
    (item) => item.id === assignmentRef.assignmentId && item.courseId === assignmentRef.courseId
  );

  if (!assignment) return;

  const checklistKey = `${assignment.courseId}:${assignment.id}`;
  const items = checklists[checklistKey] || [
    { text: 'Review assignment instructions', done: false },
    { text: 'Plan your study blocks', done: false },
    { text: 'Submit before deadline', done: false }
  ];

  const panel = document.createElement('aside');
  panel.id = 'classpulse-panel';
  const badge = statusBadge(assignment);

  panel.innerHTML = `
    <div class="cp-header">ClassPulse</div>
    <div class="cp-body">
      <div><strong>Course:</strong> ${escapeHtml(assignment.courseName)}</div>
      <div><strong>Due:</strong> ${formatDateTime(assignment.dueAt)}</div>
      <div><strong>Status:</strong> ${badge.label}</div>
      <div style="margin-top:8px;"><strong>Checklist</strong></div>
      <ul id="cp-checklist"></ul>
    </div>
  `;

  document.body.appendChild(panel);

  const listEl = panel.querySelector('#cp-checklist');
  items.forEach((item, index) => {
    const li = document.createElement('li');
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = Boolean(item.done);
    checkbox.addEventListener('change', async () => {
      items[index].done = checkbox.checked;
      checklists[checklistKey] = items;
      await chrome.storage.local.set({ checklists });
    });

    const textNode = document.createTextNode(` ${item.text}`);
    label.append(checkbox, textNode);
    li.appendChild(label);
    listEl.appendChild(li);
  });
})();

function parseAssignmentFromUrl(urlString) {
  try {
    const url = new URL(urlString);
    const match = url.pathname.match(/\/courses\/(\d+)\/assignments\/(\d+)/);
    if (!match) return null;
    return { courseId: Number(match[1]), assignmentId: Number(match[2]) };
  } catch {
    return null;
  }
}

function formatDateTime(dateLike) {
  const date = dateLike ? new Date(dateLike) : null;
  if (!date || Number.isNaN(date.getTime())) return 'No due date';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function statusBadge(assignment) {
  if (assignment.submissionStatus === 'submitted') return { label: 'Submitted' };
  if (assignment.submissionStatus === 'missing') return { label: 'Missing' };
  const due = assignment.dueAt ? new Date(assignment.dueAt) : null;
  if (!due || Number.isNaN(due.getTime())) return { label: 'Upcoming' };

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const startOfDayAfter = new Date(startOfTomorrow);
  startOfDayAfter.setDate(startOfDayAfter.getDate() + 1);

  if (due < now) return { label: 'Overdue' };
  if (due >= startOfToday && due < startOfTomorrow) return { label: 'Due Today' };
  if (due >= startOfTomorrow && due < startOfDayAfter) return { label: 'Due Tomorrow' };
  return { label: 'Upcoming' };
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
