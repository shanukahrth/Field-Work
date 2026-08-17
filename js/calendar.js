/**
 * js/calendar.js — logic for calendar.html
 * Renders tasks, work logs and reminders as color-coded FullCalendar events.
 */
let currentUser, calendar, teamMembers = [];

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = initPage('calendar', 'employee,manager,super_admin');
  if (!currentUser) return;

  if (currentUser.role !== 'employee') {
    teamMembers = currentUser.role === 'manager' ? await API.users.getEmployeesForManager(currentUser.id) : await API.users.getAllEmployees();
  }

  await renderCalendar();
  wireQuickAdd();
});

function employeeName(id) {
  if (id === currentUser.id) return currentUser.name;
  const e = teamMembers.find(e => e.id === id);
  return e ? e.name : 'Someone';
}

async function buildEvents() {
  const ids = currentUser.role === 'employee' ? [currentUser.id] : teamMembers.map(e => e.id);
  const [tasks, logs, reminders] = await Promise.all([
    currentUser.role === 'employee' ? API.tasks.getForUser(currentUser.id) : API.tasks.getForUsers(ids),
    currentUser.role === 'employee' ? API.workLogs.getForUser(currentUser.id) : API.workLogs.getForUsers(ids),
    currentUser.role === 'employee' ? API.reminders.getForUser(currentUser.id) : API.reminders.getAll()
  ]);

  const events = [];
  tasks.forEach(t => events.push({
    id: 'task_' + t.id, title: `📋 ${t.title}`, start: t.dueDate, allDay: true,
    color: isOverdue(t.dueDate, t.status) || t.priority === 'High' ? '#EF4444' : '#3457D5',
    extendedProps: { type: 'task', data: t }
  }));
  logs.forEach(l => events.push({
    id: 'log_' + l.id, title: `🛠️ ${l.clientName}`, start: l.date, allDay: true,
    color: '#14B8A6', extendedProps: { type: 'log', data: l }
  }));
  reminders.forEach(r => events.push({
    id: 'reminder_' + r.id, title: `🔔 ${r.title}`, start: r.datetime,
    color: '#8B5CF6', extendedProps: { type: 'reminder', data: r }
  }));
  return events;
}

async function renderCalendar() {
  const events = await buildEvents();
  const el = document.getElementById('fullCalendarEl');
  calendar = new FullCalendar.Calendar(el, {
    initialView: 'dayGridMonth',
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
    height: 720,
    events,
    dayMaxEvents: 3,
    eventClick: (info) => showEventDetails(info.event),
    dateClick: (info) => openQuickAdd(info.dateStr)
  });
  calendar.render();
}

function showEventDetails(event) {
  const { type, data } = event.extendedProps;
  const title = document.getElementById('eventDetailsTitle');
  const body = document.getElementById('eventDetailsBody');
  const footer = document.getElementById('eventDetailsFooter');
  footer.innerHTML = '';

  if (type === 'task') {
    title.textContent = data.title;
    body.innerHTML = `
      <p class="text-muted-fw">${escapeHtml(data.description || 'No description provided.')}</p>
      <div class="d-flex gap-2 mb-2">${priorityBadge(data.priority)} ${statusPill(isOverdue(data.dueDate, data.status) ? 'Overdue' : data.status)}</div>
      <div class="small text-muted-fw">Due ${formatDateLong(data.dueDate)}</div>
      ${currentUser.role !== 'employee' ? `<div class="small text-muted-fw">Assigned to ${escapeHtml(employeeName(data.assignedTo))}</div>` : ''}`;
    footer.innerHTML = `<a href="tasks.html" class="btn btn-primary btn-sm">Open in Tasks</a>`;
  } else if (type === 'log') {
    title.textContent = `Work Log: ${data.clientName}`;
    body.innerHTML = `
      <p class="text-muted-fw">${escapeHtml(data.description)}</p>
      <div class="small text-muted-fw mb-1"><strong>Location:</strong> ${escapeHtml(data.location)}</div>
      <div class="small text-muted-fw mb-1"><strong>Time:</strong> ${data.startTime} - ${data.endTime} (${escapeHtml(data.timeSpent || '—')})</div>
      <div class="mt-2">${statusPill(data.status)}</div>`;
    footer.innerHTML = `<a href="work-log.html" class="btn btn-primary btn-sm">Open in Work Logs</a>`;
  } else if (type === 'reminder') {
    title.textContent = data.title;
    body.innerHTML = `
      <p class="text-muted-fw">${escapeHtml(data.message)}</p>
      <div class="small text-muted-fw">${formatDateTime(data.datetime)}</div>`;
    footer.innerHTML = `<a href="reminders.html" class="btn btn-primary btn-sm">Open in Reminders</a>`;
  }
  new bootstrap.Modal(document.getElementById('eventDetailsModal')).show();
}

function openQuickAdd(dateStr) {
  if (currentUser.role !== 'employee') {
    showToast('Assign tasks to your team from the Task Management page.', 'info');
    return;
  }
  document.getElementById('cqDueDate').value = dateStr;
  document.getElementById('cqTitle').value = '';
  new bootstrap.Modal(document.getElementById('calendarQuickAddModal')).show();
}

function wireQuickAdd() {
  document.getElementById('calendarQuickAddForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await API.tasks.create({
      title: document.getElementById('cqTitle').value.trim(),
      description: '', priority: document.getElementById('cqPriority').value,
      dueDate: document.getElementById('cqDueDate').value, reminder: false,
      createdBy: currentUser.id, assignedTo: currentUser.id, status: 'Pending'
    });
    bootstrap.Modal.getInstance(document.getElementById('calendarQuickAddModal')).hide();
    showToast('Task added to calendar.', 'success');
    calendar.removeAllEvents();
    (await buildEvents()).forEach(ev => calendar.addEvent(ev));
  });
}
