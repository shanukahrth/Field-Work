/**
 * js/employee-dashboard.js — logic for employee-dashboard.html
 */
let currentUser;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = initPage('employee-dashboard', 'employee');
  if (!currentUser) return;

  document.getElementById('welcomeHeading').textContent = `Welcome back, ${currentUser.name.split(' ')[0]}!`;
  document.getElementById('welcomeDate').textContent = formatDateLong(todayISO());
  document.getElementById('wlDate').value = todayISO();
  document.getElementById('qtDueDate').value = todayISO();

  await loadDashboard();
  initMiniCalendar();
  wireForms();
});

async function loadDashboard() {
  const [tasks, logs, reminders] = await Promise.all([
    API.tasks.getForUser(currentUser.id),
    API.workLogs.getForUser(currentUser.id),
    API.reminders.getForUser(currentUser.id)
  ]);

  renderStats(tasks);
  renderTodaysTasks(tasks);
  renderPendingTasks(tasks);
  renderTodaysWorkLog(logs);
  renderUpcomingReminders(reminders);
}

function renderStats(tasks) {
  const total = tasks.length;
  const pending = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
  const completed = tasks.filter(t => t.status === 'Completed').length;
  const overdue = tasks.filter(t => isOverdue(t.dueDate, t.status)).length;
  document.getElementById('statTotal').textContent = total;
  document.getElementById('statPending').textContent = pending;
  document.getElementById('statCompleted').textContent = completed;
  document.getElementById('statOverdue').textContent = overdue;
}

function renderTodaysTasks(tasks) {
  const today = todayISO();
  const todays = tasks.filter(t => t.dueDate === today);
  const container = document.getElementById('todaysTasksList');
  if (todays.length === 0) {
    container.innerHTML = emptyState('event_available', 'Nothing due today. Enjoy the breathing room.');
    return;
  }
  container.innerHTML = todays.map(t => `
    <div class="d-flex align-items-start gap-3 accent-bar ${isOverdue(t.dueDate, t.status) ? 'a-overdue' : 'a-task'} py-2 mb-2">
      <div class="form-check mt-1">
        <input class="form-check-input task-quick-check" type="checkbox" data-task-id="${t.id}" ${t.status === 'Completed' ? 'checked' : ''}>
      </div>
      <div class="flex-grow-1">
        <div class="fw-semibold ${t.status === 'Completed' ? 'text-decoration-line-through text-muted-fw' : ''}">${escapeHtml(t.title)}</div>
        <div class="small text-muted-fw">${escapeHtml(t.description || '')}</div>
      </div>
      <div class="text-end">
        ${priorityBadge(t.priority)}
        <div class="mt-1">${statusPill(t.status)}</div>
      </div>
    </div>`).join('');

  container.querySelectorAll('.task-quick-check').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const newStatus = e.target.checked ? 'Completed' : 'Pending';
      await API.tasks.update(e.target.dataset.taskId, { status: newStatus });
      showToast(`Task marked as ${newStatus}.`, 'success');
      await loadDashboard();
    });
  });
}

function renderPendingTasks(tasks) {
  const pending = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const tbody = document.getElementById('pendingTasksTable');
  if (pending.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted-fw py-4">No pending tasks right now.</td></tr>`;
    return;
  }
  tbody.innerHTML = pending.slice(0, 6).map(t => `
    <tr>
      <td class="fw-semibold">${escapeHtml(t.title)}</td>
      <td>${priorityBadge(t.priority)}</td>
      <td class="${isOverdue(t.dueDate, t.status) ? 'text-danger fw-semibold' : ''}">${formatDateShort(t.dueDate)}</td>
      <td>${statusPill(isOverdue(t.dueDate, t.status) ? 'Overdue' : t.status)}</td>
    </tr>`).join('');
}

function renderTodaysWorkLog(logs) {
  const today = todayISO();
  const todays = logs.filter(l => l.date === today);
  const container = document.getElementById('todaysWorkLogList');
  if (todays.length === 0) {
    container.innerHTML = emptyState('work_history', 'No work logged today yet. Use "Quick Add Work Log" to get started.');
    return;
  }
  container.innerHTML = todays.map(l => `
    <div class="accent-bar a-log py-2 mb-3">
      <div class="d-flex justify-content-between">
        <div class="fw-semibold">${escapeHtml(l.clientName)} <span class="text-muted-fw fw-normal">· ${escapeHtml(l.location)}</span></div>
        ${statusPill(l.status)}
      </div>
      <div class="small text-muted-fw">${l.startTime} - ${l.endTime} &middot; ${escapeHtml(l.timeSpent || '')}</div>
      <div class="small mt-1">${escapeHtml(l.description)}</div>
    </div>`).join('');
}

function renderUpcomingReminders(reminders) {
  const upcoming = reminders.slice().sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  const container = document.getElementById('upcomingRemindersList');
  if (upcoming.length === 0) {
    container.innerHTML = emptyState('notifications_off', 'No reminders set.');
    return;
  }
  container.innerHTML = upcoming.map(r => `
    <div class="accent-bar a-reminder py-2 mb-3">
      <div class="fw-semibold small">${escapeHtml(r.title)}</div>
      <div class="small text-muted-fw">${escapeHtml(r.message)}</div>
      <div class="small text-muted-fw mt-1"><span class="material-symbols-outlined" style="font-size:14px;">schedule</span> ${formatDateTime(r.datetime)}</div>
    </div>`).join('');
}

function emptyState(icon, text) {
  return `<div class="empty-state py-4">
    <span class="material-symbols-outlined d-block mb-2">${icon}</span>
    <div class="small">${text}</div>
  </div>`;
}

/* ---------------- Mini calendar (FullCalendar) ---------------- */
async function initMiniCalendar() {
  const [tasks, logs] = await Promise.all([API.tasks.getForUser(currentUser.id), API.workLogs.getForUser(currentUser.id)]);
  const events = [
    ...tasks.map(t => ({ title: t.title, start: t.dueDate, color: t.priority === 'High' ? '#EF4444' : '#3457D5' })),
    ...logs.map(l => ({ title: 'Work: ' + l.clientName, start: l.date, color: '#14B8A6' }))
  ];
  const el = document.getElementById('dashboardMiniCalendar');
  const calendar = new FullCalendar.Calendar(el, {
    initialView: 'dayGridMonth',
    height: 320,
    headerToolbar: { left: 'prev', center: 'title', right: 'next' },
    events,
    dayMaxEvents: 1
  });
  calendar.render();
}

/* ---------------- Forms ---------------- */
function wireForms() {
  document.getElementById('quickTaskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await API.tasks.create({
      title: document.getElementById('qtTitle').value.trim(),
      description: document.getElementById('qtDescription').value.trim(),
      priority: document.getElementById('qtPriority').value,
      dueDate: document.getElementById('qtDueDate').value,
      reminder: document.getElementById('qtReminder').checked,
      status: 'Pending',
      createdBy: currentUser.id,
      assignedTo: currentUser.id
    });
    bootstrap.Modal.getInstance(document.getElementById('quickAddTaskModal')).hide();
    e.target.reset();
    document.getElementById('qtDueDate').value = todayISO();
    showToast('Task added successfully.', 'success');
    await loadDashboard();
  });

  document.getElementById('quickWorkLogForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('wlAttachment');
    await API.workLogs.create({
      employeeId: currentUser.id,
      date: document.getElementById('wlDate').value,
      startTime: document.getElementById('wlStartTime').value,
      endTime: document.getElementById('wlEndTime').value,
      clientName: document.getElementById('wlClient').value.trim(),
      location: document.getElementById('wlLocation').value.trim(),
      description: document.getElementById('wlDescription').value.trim(),
      issueIdentified: document.getElementById('wlIssue').value.trim(),
      actionTaken: document.getElementById('wlAction').value.trim(),
      timeSpent: document.getElementById('wlTimeSpent').value.trim(),
      status: document.getElementById('wlStatus').value,
      remarks: document.getElementById('wlRemarks').value.trim(),
      attachment: fileInput.files[0] ? fileInput.files[0].name : ''
    });
    bootstrap.Modal.getInstance(document.getElementById('quickAddWorkLogModal')).hide();
    e.target.reset();
    document.getElementById('wlDate').value = todayISO();
    showToast('Work log saved.', 'success');
    await loadDashboard();
  });
}
