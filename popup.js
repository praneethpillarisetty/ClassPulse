import { STORAGE_KEYS, formatDateTime, safeDate } from './utils.js';

const app = document.getElementById('app');
const toast = document.getElementById('toast');
let state = {};
let activeFilter = 'upcoming';

init();

async function init() {
  state = await chrome.storage.local.get([
    STORAGE_KEYS.AUTH,
    STORAGE_KEYS.ASSIGNMENTS,
    STORAGE_KEYS.COURSES,
    STORAGE_KEYS.LAST_SYNC_AT,
    STORAGE_KEYS.USER
  ]);
  if (!state.authState?.canvasBaseUrl || !state.authState?.accessToken) {
    renderConnect();
    return;
  }
  renderDashboard();
}

function renderConnect() {
  app.innerHTML = `
    <section class="connect-card">
      <div class="logo">CP</div>
      <h2>ClassPulse</h2>
      <p>Your Canvas command center for assignments, deadlines, reminders, and planning.</p>
      <button id="openOptions" class="primary-btn">Set up Canvas</button>
      <div class="footer-link"><button id="openPrivacy">Your data stays in your browser</button></div>
    </section>`;
  document.getElementById('openOptions').onclick = () => chrome.runtime.openOptionsPage();
  document.getElementById('openPrivacy').onclick = () => chrome.runtime.openOptionsPage();
}

function renderDashboard() {
  const assignments = state.assignments || [];
  const connected = !!state.authState;
  const courses = ['All courses', ...new Set(assignments.map(x => x.courseName).filter(Boolean))];
  app.innerHTML = `
    <header class="topbar">
      <div class="brand">
        <div class="logo">CP</div>
        <div><h1>ClassPulse</h1><p class="subtitle">Your Canvas command center</p></div>
      </div>
      <div class="actions">
        <div class="status-pill"><span class="dot ${connected ? '' : 'error'}"></span>${connected ? 'Live' : 'Setup'}</div>
        <button id="sync" class="icon-btn" title="Sync now" aria-label="Sync now">↻</button>
        <button id="settings" class="icon-btn" title="Settings" aria-label="Settings">⚙</button>
      </div>
    </header>

    <div class="meta-row">
      <span class="last-sync">${state.canvasUser?.name ? `Hi, ${escapeHtml(state.canvasUser.name.split(' ')[0])}` : 'Connected to Canvas'}</span>
      <span class="last-sync">Last sync: ${state.lastSyncAt ? new Date(state.lastSyncAt).toLocaleString() : 'Never'}</span>
    </div>

    <section class="stats">
      <div class="stat-card" style="--glow:rgba(239,68,68,.22)"><div class="stat-value" style="color:var(--danger)">${count('today')}</div><div class="stat-label">Today</div></div>
      <div class="stat-card" style="--glow:rgba(250,204,21,.22)"><div class="stat-value" style="color:var(--warn)">${count('week')}</div><div class="stat-label">Week</div></div>
      <div class="stat-card" style="--glow:rgba(34,197,94,.22)"><div class="stat-value" style="color:var(--success)">${assignments.filter(x => x.submitted).length}</div><div class="stat-label">Done</div></div>
    </section>

    <section class="toolbar">
      <input id="q" class="search" placeholder="Search assignments" />
      <select id="course" class="select">${courses.map(c => `<option>${escapeHtml(c)}</option>`).join('')}</select>
    </section>

    <nav class="tabs" aria-label="Assignment filters">
      ${tab('today','Today')}${tab('week','Week')}${tab('upcoming','Upcoming')}${tab('submitted','Done')}
    </nav>

    <div class="section-head"><h2 id="sectionTitle">Upcoming Items</h2><span class="date-label">${new Date().toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})}</span></div>
    <section id="list" class="list"></section>`;

  document.getElementById('sync').onclick = sync;
  document.getElementById('settings').onclick = () => chrome.runtime.openOptionsPage();
  document.querySelectorAll('.tab').forEach(b => b.onclick = () => { activeFilter = b.dataset.f; renderDashboard(); });
  document.getElementById('q').oninput = () => draw(activeFilter);
  document.getElementById('course').onchange = () => draw(activeFilter);
  draw(activeFilter);
}

function tab(key, label) { return `<button class="tab ${activeFilter === key ? 'active' : ''}" data-f="${key}">${label}</button>`; }

function count(mode) {
  const now = Date.now();
  const today = new Date();
  return (state.assignments || []).filter(x => {
    if (x.submitted) return false;
    const d = safeDate(x.dueAt);
    if (!d) return false;
    if (mode === 'today') return d.toDateString() === today.toDateString();
    if (mode === 'week') return d.getTime() >= now && d.getTime() <= now + 7 * 24 * 3600e3;
    return false;
  }).length;
}

function draw(filter) {
  const q = (document.getElementById('q')?.value || '').toLowerCase();
  const c = document.getElementById('course')?.value || 'All courses';
  const now = Date.now();
  const titleMap = { today: 'Due Today', week: 'This Week', upcoming: 'Upcoming Items', submitted: 'Completed' };
  const sectionTitle = document.getElementById('sectionTitle');
  if (sectionTitle) sectionTitle.textContent = titleMap[filter] || 'Upcoming Items';

  let arr = (state.assignments || []).filter(x => {
    const name = (x.name || '').toLowerCase();
    const course = (x.courseName || '').toLowerCase();
    return (!q || name.includes(q) || course.includes(q)) && (c === 'All courses' || x.courseName === c);
  });

  arr = arr.filter(x => {
    const d = safeDate(x.dueAt);
    if (filter === 'submitted') return x.submitted;
    if (x.submitted) return false;
    if (filter === 'today') return d && d.toDateString() === new Date().toDateString();
    if (filter === 'week') return d && d.getTime() >= now && d.getTime() <= now + 7 * 24 * 3600e3;
    return !d || d.getTime() >= now;
  }).sort((a,b) => (safeDate(a.dueAt)?.getTime() || Infinity) - (safeDate(b.dueAt)?.getTime() || Infinity));

  const list = document.getElementById('list');
  if (!arr.length) {
    list.innerHTML = `<div class="empty"><div class="emoji">🎉</div><strong>${filter === 'today' ? 'No assignments today' : 'You’re all caught up'}</strong><p>${filter === 'submitted' ? 'Submitted assignments will appear here after your next sync.' : 'Nothing urgent found for this view.'}</p></div>`;
    return;
  }

  list.innerHTML = arr.map(x => assignmentCard(x)).join('');
  list.querySelectorAll('.open-btn').forEach(b => b.onclick = () => {
    if (b.dataset.url) chrome.tabs.create({ url: b.dataset.url });
  });
}

function assignmentCard(x) {
  const status = getStatus(x);
  const dueLabel = x.dueAt ? relativeDue(x.dueAt) : 'No due date';
  return `<article class="assignment-card" style="--course:${x.courseColor || '#4F8CFF'}">
    <div class="card-top">
      <span class="course-name">${escapeHtml(x.courseName || 'Canvas Course')}</span>
      <span class="badge ${status.cls}">${status.label}</span>
    </div>
    <h3 class="assignment-title">${escapeHtml(x.name || 'Untitled Assignment')}</h3>
    <div class="card-bottom">
      <div class="due"><span class="clock"></span><span>${escapeHtml(dueLabel)} · ${x.pointsPossible ?? '—'} pts</span></div>
      <button class="open-btn" data-url="${escapeAttr(x.htmlUrl || '')}">Open</button>
    </div>
  </article>`;
}

function getStatus(x) {
  if (x.submitted) return { label: 'Submitted', cls: 'success' };
  const d = safeDate(x.dueAt);
  if (!d) return { label: 'No date', cls: 'neutral' };
  const ms = d.getTime() - Date.now();
  if (ms <= 0) return { label: 'Overdue', cls: 'danger' };
  if (d.toDateString() === new Date().toDateString()) return { label: 'Due Today', cls: 'danger' };
  if (ms <= 3 * 24 * 3600e3) return { label: 'Soon', cls: 'warn' };
  return { label: 'Upcoming', cls: 'neutral' };
}

function relativeDue(value) {
  const d = safeDate(value);
  if (!d) return 'No due date';
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  if (diff > 0 && abs < 3600e3) return `in ${Math.max(1, Math.round(abs / 60000))}m`;
  if (diff > 0 && abs < 24 * 3600e3) return `in ${Math.round(abs / 3600e3)}h`;
  if (diff > 0 && abs < 48 * 3600e3) return `tomorrow ${d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}`;
  return formatDateTime(value);
}

async function sync() {
  const b = document.getElementById('sync');
  b.disabled = true;
  b.classList.add('syncing');
  showToast('Syncing Canvas…');
  const r = await chrome.runtime.sendMessage({ type: 'SYNC_NOW' });
  b.disabled = false;
  b.classList.remove('syncing');
  if (!r?.ok) {
    showToast(r?.error || 'Sync failed', true);
    return;
  }
  showToast(`Synced ${r.result?.assignments ?? 0} assignments`);
  await init();
}

function showToast(message, isError = false) {
  toast.textContent = message;
  toast.className = `toast ${isError ? 'error' : ''}`;
  toast.hidden = false;
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => { toast.hidden = true; }, 2600);
}

function escapeHtml(s='') { return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function escapeAttr(s='') { return escapeHtml(s).replace(/`/g, '&#96;'); }
