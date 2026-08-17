/**
 * js/admin-dashboard.js — logic for admin-dashboard.html
 */
document.addEventListener('DOMContentLoaded', async () => {
  const user = initPage('admin-dashboard', 'super_admin');
  if (!user) return;

  document.getElementById('welcomeHeading').textContent = `Welcome back, ${user.name.split(' ')[0]}!`;

  const [managers, employees, tasks, activity] = await Promise.all([
    API.users.getAllManagers(),
    API.users.getAllEmployees(),
    API.tasks.getAll(),
    API.activity.getRecent(10)
  ]);

  document.getElementById('statManagers').textContent = managers.length;
  document.getElementById('statAllEmployees').textContent = employees.length;
  document.getElementById('statAllTasks').textContent = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Cancelled').length;
  document.getElementById('statDisabled').textContent = [...managers, ...employees].filter(u => u.status === 'disabled').length;

  const tbody = document.getElementById('managerSummaryTable');
  tbody.innerHTML = managers.map(m => {
    const team = employees.filter(e => e.managerId === m.id);
    const teamIds = team.map(e => e.id);
    const pending = tasks.filter(t => teamIds.includes(t.assignedTo) && (t.status === 'Pending' || t.status === 'In Progress')).length;
    return `<tr>
      <td><div class="d-flex align-items-center gap-2"><div class="avatar-sm" style="background:${m.avatarColor}">${getInitials(m.name)}</div>${escapeHtml(m.name)}</div></td>
      <td>${team.length} employee${team.length !== 1 ? 's' : ''}</td>
      <td>${pending}</td>
      <td>${statusPill(m.status)}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="4" class="text-center text-muted-fw py-4">No managers yet.</td></tr>`;

  const users = [...managers, ...employees];
  const nameOf = (id) => (users.find(u => u.id === id) || {}).name || 'A user';
  const list = document.getElementById('systemActivityList');
  list.innerHTML = activity.length ? activity.map(a => `
    <div class="timeline-item">
      <div class="small"><strong>${escapeHtml(nameOf(a.userId))}</strong> ${escapeHtml(a.message)}</div>
      <div class="small text-muted-fw">${formatDateTime(a.time)}</div>
    </div>`).join('') : `<div class="empty-state"><span class="material-symbols-outlined">history</span><div>No recent activity.</div></div>`;
});
