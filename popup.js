import { STORAGE_KEYS, formatDateTime, sortAssignmentsByDueDate, statusBadge } from './utils.js';

const studentNameEl = document.getElementById('studentName');
const statusEl = document.getElementById('status');
const listEl = document.getElementById('assignmentList');
const searchInputEl = document.getElementById('searchInput');
const courseFilterEl = document.getElementById('courseFilter');
const syncBtnEl = document.getElementById('syncBtn');

let allAssignments = [];

init();

async function init() {
  await loadData();
  searchInputEl.addEventListener('input', render);
  courseFilterEl.addEventListener('change', render);
  syncBtnEl.addEventListener('click', handleSync);
}

async function loadData() {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.USER,
    STORAGE_KEYS.ASSIGNMENTS,
    STORAGE_KEYS.LAST_SYNC_AT
  ]);

  const user = data[STORAGE_KEYS.USER];
  allAssignments = sortAssignmentsByDueDate(data[STORAGE_KEYS.ASSIGNMENTS] || []);

  studentNameEl.textContent = user?.name ? `Hi, ${user.name}` : 'Connect Canvas in Options to begin.';
  statusEl.textContent = data[STORAGE_KEYS.LAST_SYNC_AT]
    ? `Last synced: ${new Date(data[STORAGE_KEYS.LAST_SYNC_AT]).toLocaleString()}`
    : 'No sync yet';

  hydrateCourseFilter(allAssignments);
  render();
}

function hydrateCourseFilter(assignments) {
  const courses = [...new Set(assignments.map((a) => a.courseName))];
  courseFilterEl.innerHTML = '<option value="">All Courses</option>';
  courses.forEach((course) => {
    const option = document.createElement('option');
    option.value = course;
    option.textContent = course;
    courseFilterEl.appendChild(option);
  });
}

function render() {
  const searchTerm = searchInputEl.value.trim().toLowerCase();
  const selectedCourse = courseFilterEl.value;

  const filtered = allAssignments.filter((assignment) => {
    const matchesSearch =
      !searchTerm ||
      assignment.name.toLowerCase().includes(searchTerm) ||
      assignment.courseName.toLowerCase().includes(searchTerm);
    const matchesCourse = !selectedCourse || assignment.courseName === selectedCourse;
    return matchesSearch && matchesCourse;
  });

  if (!filtered.length) {
    listEl.innerHTML = '<div class="empty">No assignments found.</div>';
    return;
  }

  listEl.innerHTML = '';
  filtered.forEach((assignment) => {
    const card = document.createElement('article');
    card.className = 'card';

    const badge = statusBadge(assignment);

    card.innerHTML = `
      <h3>${escapeHtml(assignment.name)}</h3>
      <div class="meta">${escapeHtml(assignment.courseName)}</div>
      <div class="meta">Due: ${formatDateTime(assignment.dueAt)}</div>
      <div class="row">
        <span class="badge ${badge.type}">${badge.label}</span>
        <a class="open-link" href="#">Open in Canvas</a>
      </div>
    `;

    card.querySelector('.open-link').addEventListener('click', async (event) => {
      event.preventDefault();
      await chrome.tabs.create({ url: assignment.htmlUrl });
    });

    listEl.appendChild(card);
  });
}

async function handleSync() {
  statusEl.textContent = 'Syncing…';
  syncBtnEl.disabled = true;
  try {
    const response = await chrome.runtime.sendMessage({ type: 'SYNC_NOW' });
    if (!response?.ok) throw new Error(response?.error || 'Unknown sync error');
    await loadData();
    statusEl.textContent = 'Sync complete';
  } catch (error) {
    statusEl.textContent = `Sync failed: ${error.message}`;
  } finally {
    syncBtnEl.disabled = false;
  }
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
