/**
 * js/reports.js — logic for reports.html
 */
let currentUser, teamMembers = [], charts = {};

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = initPage('reports', 'employee,manager,super_admin');
  if (!currentUser) return;

  if (currentUser.role !== 'employee') {
    document.getElementById('reportEmployeeWrap').style.display = '';
    document.getElementById('reportEmpColHeader').style.display = '';
    document.getElementById('productivityRow').style.display = '';
    document.getElementById('reportsSubtitle').textContent = "Understand your team's performance across tasks and field visits.";
    teamMembers = currentUser.role === 'manager' ? await API.users.getEmployeesForManager(currentUser.id) : await API.users.getAllEmployees();
    const sel = document.getElementById('reportEmployee');
    teamMembers.forEach(e => sel.insertAdjacentHTML('beforeend', `<option value="${e.id}">${escapeHtml(e.name)}</option>`));
  }

  document.getElementById('applyReportFilterBtn').addEventListener('click', buildReports);
  await buildReports();
});

function employeeName(id) {
  if (id === currentUser.id) return currentUser.name;
  const e = teamMembers.find(e => e.id === id);
  return e ? e.name : 'Unknown';
}

async function getScopedData() {
  const empFilter = document.getElementById('reportEmployee')?.value;
  const from = document.getElementById('reportDateFrom').value;
  const to = document.getElementById('reportDateTo').value;

  let ids;
  if (currentUser.role === 'employee') ids = [currentUser.id];
  else if (empFilter) ids = [empFilter];
  else ids = teamMembers.map(e => e.id);

  let [tasks, logs] = await Promise.all([API.tasks.getForUsers(ids), API.workLogs.getForUsers(ids)]);
  if (from) { tasks = tasks.filter(t => t.dueDate >= from); logs = logs.filter(l => l.date >= from); }
  if (to) { tasks = tasks.filter(t => t.dueDate <= to); logs = logs.filter(l => l.date <= to); }
  return { tasks, logs, ids };
}

function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

async function buildReports() {
  const { tasks, logs, ids } = await getScopedData();

  // Stat cards
  const completed = tasks.filter(t => t.status === 'Completed').length;
  document.getElementById('rStatTotalTasks').textContent = tasks.length;
  document.getElementById('rStatCompletionRate').textContent = tasks.length ? `${Math.round((completed / tasks.length) * 100)}%` : '0%';
  document.getElementById('rStatPendingWork').textContent = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
  document.getElementById('rStatWorkLogs').textContent = logs.length;

  // Task completion doughnut
  destroyChart('completion');
  const statusCounts = { Pending: 0, 'In Progress': 0, Completed: 0, Cancelled: 0 };
  tasks.forEach(t => statusCounts[t.status] = (statusCounts[t.status] || 0) + 1);
  charts.completion = new Chart(document.getElementById('taskCompletionChart'), {
    type: 'doughnut',
    data: { labels: Object.keys(statusCounts), datasets: [{ data: Object.values(statusCounts), backgroundColor: ['#F59E0B', '#3457D5', '#14B8A6', '#94A3B8'], borderWidth: 0 }] },
    options: { plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } }, cutout: '65%' }
  });

  // Monthly work summary (last 6 months: tasks completed vs work logs filed)
  destroyChart('monthly');
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }
  const monthLabels = months.map(m => new Date(m + '-02').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
  const tasksCompletedByMonth = months.map(m => tasks.filter(t => t.status === 'Completed' && t.dueDate.slice(0, 7) === m).length);
  const logsByMonth = months.map(m => logs.filter(l => l.date.slice(0, 7) === m).length);
  charts.monthly = new Chart(document.getElementById('monthlySummaryChart'), {
    type: 'bar',
    data: {
      labels: monthLabels,
      datasets: [
        { label: 'Tasks Completed', data: tasksCompletedByMonth, backgroundColor: '#3457D5', borderRadius: 6, maxBarThickness: 28 },
        { label: 'Work Logs Filed', data: logsByMonth, backgroundColor: '#14B8A6', borderRadius: 6, maxBarThickness: 28 }
      ]
    },
    options: { scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { position: 'bottom' } } }
  });

  // Employee productivity (manager/admin only)
  if (currentUser.role !== 'employee') {
    destroyChart('productivity');
    const scope = teamMembers.filter(e => ids.includes(e.id));
    const labels = scope.map(e => e.name);
    const completedByEmp = scope.map(e => tasks.filter(t => t.assignedTo === e.id && t.status === 'Completed').length);
    const pendingByEmp = scope.map(e => tasks.filter(t => t.assignedTo === e.id && (t.status === 'Pending' || t.status === 'In Progress')).length);
    charts.productivity = new Chart(document.getElementById('productivityChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Completed', data: completedByEmp, backgroundColor: '#14B8A6', borderRadius: 6 },
          { label: 'Pending', data: pendingByEmp, backgroundColor: '#F59E0B', borderRadius: 6 }
        ]
      },
      options: { indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { position: 'bottom' } } }
    });
  }

  // Work log history table
  const showEmpCol = currentUser.role !== 'employee';
  const tbody = document.getElementById('workLogHistoryTable');
  const sorted = logs.slice().sort((a, b) => b.date.localeCompare(a.date));
  tbody.innerHTML = sorted.length ? sorted.map(l => `
    <tr>
      ${showEmpCol ? `<td>${escapeHtml(employeeName(l.employeeId))}</td>` : ''}
      <td>${formatDateShort(l.date)}</td>
      <td>${escapeHtml(l.clientName)}</td>
      <td>${escapeHtml(l.timeSpent || '—')}</td>
      <td>${statusPill(l.status)}</td>
    </tr>`).join('') : `<tr><td colspan="${showEmpCol ? 5 : 4}" class="text-center text-muted-fw py-4">No work logs in this range.</td></tr>`;
}
