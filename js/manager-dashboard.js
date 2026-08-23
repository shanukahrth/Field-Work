/**
 * js/manager-dashboard.js — logic for manager-dashboard.html
 */
let currentUser, myEmployees = [];

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = initPage('manager-dashboard', 'manager');
  if (!currentUser) return;

  document.getElementById('welcomeHeading').textContent = `Welcome back, ${currentUser.name.split(' ')[0]}!`;
  document.getElementById('welcomeDate').textContent = formatDateLong(todayISO());

  // Includes sub-managers reporting to this manager too, not just employees —
  // supports multi-level org structures.
  myEmployees = await API.users.getDirectReports(currentUser.id);
  const employeeIds = myEmployees.map(e => e.id);

  const [tasks, logs, activity] = await Promise.all([
    API.tasks.getForUsers(employeeIds),
    API.workLogs.getForUsers(employeeIds),
    API.activity.getRecent(8)
  ]);

  renderStats(tasks, logs);
  renderEmployeeOverview(myEmployees, tasks);
  renderActivityFeed(activity);
  renderTaskChart(tasks);
  renderWorkLogChart(logs);
  renderPendingByEmployee(tasks);
  renderRecentWorkLogs(logs);
  initManagerCalendar(tasks, logs);
});

function employeeName(id) {
  const emp = myEmployees.find(e => e.id === id);
  return emp ? emp.name : 'Unknown';
}
function employeeColor(id) {
  const emp = myEmployees.find(e => e.id === id);
  return emp ? emp.avatarColor : '#3457D5';
}

function renderStats(tasks, logs) {
  document.getElementById('statEmployees').textContent = myEmployees.filter(e => e.status === 'active').length;
  document.getElementById('statTeamPending').textContent = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
  const thisMonth = todayISO().slice(0, 7);
  document.getElementById('statTeamCompleted').textContent = tasks.filter(t => t.status === 'Completed' && t.dueDate.slice(0, 7) === thisMonth).length;
  document.getElementById('statTeamOverdue').textContent = tasks.filter(t => isOverdue(t.dueDate, t.status)).length;
}

function renderEmployeeOverview(employees, tasks) {
  const grid = document.getElementById('employeeOverviewGrid');
  if (employees.length === 0) {
    grid.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">group_off</span><div>No employees assigned yet.</div></div>`;
    return;
  }
  grid.innerHTML = employees.map(emp => {
    const empTasks = tasks.filter(t => t.assignedTo === emp.id);
    const pending = empTasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
    const overdue = empTasks.filter(t => isOverdue(t.dueDate, t.status)).length;
    return `
    <div class="col-md-6">
      <a href="employee-profile.html?id=${emp.id}" class="text-decoration-none text-reset">
        <div class="d-flex align-items-center gap-3 p-3 border rounded-3 h-100" style="border-color:var(--fw-border) !important;">
          <div class="avatar-md" style="background:${emp.avatarColor}">${getInitials(emp.name)}</div>
          <div class="flex-grow-1">
            <div class="fw-semibold">${escapeHtml(emp.name)}</div>
            <div class="small text-muted-fw">${escapeHtml(emp.title || '')}</div>
            <div class="d-flex gap-2 mt-1">
              <span class="pill pill-amber">${pending} pending</span>
              ${overdue > 0 ? `<span class="pill pill-red">${overdue} overdue</span>` : ''}
            </div>
          </div>
        </div>
      </a>
    </div>`;
  }).join('');
}

function renderActivityFeed(activity) {
  const container = document.getElementById('activityFeedList');
  if (activity.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">history</span><div>No recent activity.</div></div>`;
    return;
  }
  container.innerHTML = activity.map(a => `
    <div class="timeline-item">
      <div class="small"><strong>${escapeHtml(employeeName(a.userId) || 'A team member')}</strong> ${escapeHtml(a.message)}</div>
      <div class="small text-muted-fw">${formatDateTime(a.time)}</div>
    </div>`).join('');
}

function renderTaskChart(tasks) {
  const counts = {
    Pending: tasks.filter(t => t.status === 'Pending').length,
    'In Progress': tasks.filter(t => t.status === 'In Progress').length,
    Completed: tasks.filter(t => t.status === 'Completed').length,
    Cancelled: tasks.filter(t => t.status === 'Cancelled').length
  };
  new Chart(document.getElementById('taskCompletionChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(counts),
      datasets: [{ data: Object.values(counts), backgroundColor: ['#F59E0B', '#3457D5', '#14B8A6', '#94A3B8'], borderWidth: 0 }]
    },
    options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } }, cutout: '65%' }
  });
}

function renderWorkLogChart(logs) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  const counts = days.map(d => logs.filter(l => l.date === d).length);
  new Chart(document.getElementById('workLogSummaryChart'), {
    type: 'bar',
    data: {
      labels: days.map(d => formatDateShort(d)),
      datasets: [{ label: 'Work logs submitted', data: counts, backgroundColor: '#3457D5', borderRadius: 6, maxBarThickness: 36 }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
  });
}

function renderPendingByEmployee(tasks) {
  const pending = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const tbody = document.getElementById('pendingByEmployeeTable');
  if (pending.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted-fw py-4">No pending tasks across your team.</td></tr>`;
    return;
  }
  tbody.innerHTML = pending.slice(0, 8).map(t => `
    <tr>
      <td><div class="d-flex align-items-center gap-2"><div class="avatar-sm" style="background:${employeeColor(t.assignedTo)}">${getInitials(employeeName(t.assignedTo))}</div>${escapeHtml(employeeName(t.assignedTo))}</div></td>
      <td>${escapeHtml(t.title)}</td>
      <td>${priorityBadge(t.priority)}</td>
      <td class="${isOverdue(t.dueDate, t.status) ? 'text-danger fw-semibold' : ''}">${formatDateShort(t.dueDate)}</td>
    </tr>`).join('');
}

function renderRecentWorkLogs(logs) {
  const recent = logs.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
  const tbody = document.getElementById('recentWorkLogsTable');
  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted-fw py-4">No work logs yet.</td></tr>`;
    return;
  }
  tbody.innerHTML = recent.map(l => `
    <tr>
      <td><div class="d-flex align-items-center gap-2"><div class="avatar-sm" style="background:${employeeColor(l.employeeId)}">${getInitials(employeeName(l.employeeId))}</div>${escapeHtml(employeeName(l.employeeId))}</div></td>
      <td>${escapeHtml(l.clientName)}</td>
      <td>${formatDateShort(l.date)}</td>
      <td>${escapeHtml(l.timeSpent || '—')}</td>
      <td>${statusPill(l.status)}</td>
    </tr>`).join('');
}

function initManagerCalendar(tasks, logs) {
  const events = [
    ...tasks.map(t => ({ title: `${t.title} (${employeeName(t.assignedTo)})`, start: t.dueDate, color: t.priority === 'High' ? '#EF4444' : '#3457D5' })),
    ...logs.map(l => ({ title: `Log: ${l.clientName}`, start: l.date, color: '#14B8A6' }))
  ];
  const calendar = new FullCalendar.Calendar(document.getElementById('managerMiniCalendar'), {
    initialView: 'dayGridMonth', height: 340,
    headerToolbar: { left: 'prev', center: 'title', right: 'next' },
    events, dayMaxEvents: 2
  });
  calendar.render();
}
