/**
 * js/employee-profile.js — logic for employee-profile.html
 * Accessible to the employee themselves (id=self), their manager, and super admin.
 */
let viewedUser, currentUser;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = initPage('employee-profile', 'employee,manager,super_admin');
  if (!currentUser) return;

  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get('id');
  const targetId = (!requestedId || requestedId === 'self') ? currentUser.id : requestedId;

  viewedUser = await API.users.getById(targetId);
  if (!viewedUser) {
    document.querySelector('.page-content').innerHTML = `<div class="empty-state"><span class="material-symbols-outlined">person_off</span><div>Employee not found.</div></div>`;
    return;
  }

  renderProfileHeader();
  await loadProfileData();
  wireEditForm();
});

function renderProfileHeader() {
  document.getElementById('profileAvatar').style.background = viewedUser.avatarColor;
  document.getElementById('profileAvatar').textContent = getInitials(viewedUser.name);
  document.getElementById('profileName').textContent = viewedUser.name;
  document.getElementById('profileTitle').textContent = viewedUser.title || '';
  document.getElementById('profileStatusPill').innerHTML = statusPill(viewedUser.status);
  document.getElementById('profileEmail').textContent = viewedUser.email;
  document.getElementById('profilePhone').textContent = viewedUser.phone || '—';
  document.getElementById('profileJoinDate').textContent = viewedUser.joinDate ? formatDate(viewedUser.joinDate) : '—';

  API.users.getById(viewedUser.managerId).then(mgr => {
    document.getElementById('profileManager').textContent = mgr ? mgr.name : '—';
  });

  const canManage = currentUser.role === 'super_admin' || (currentUser.role === 'manager' && viewedUser.managerId === currentUser.id);
  const isSelf = currentUser.id === viewedUser.id;
  const actions = document.getElementById('profileActionButtons');
  let html = '';
  if (isSelf || canManage) {
    html += `<button class="btn btn-soft d-flex align-items-center gap-2" id="editProfileBtn"><span class="material-symbols-outlined" style="font-size:18px;">edit</span>Edit Profile</button>`;
  }
  if (canManage && viewedUser.role !== 'super_admin') {
    html += `<button class="btn btn-light d-flex align-items-center gap-2" id="profileResetPwBtn"><span class="material-symbols-outlined" style="font-size:18px;">key</span>Reset Password</button>`;
    html += `<button class="btn ${viewedUser.status === 'active' ? 'btn-outline-danger' : 'btn-outline-primary'} d-flex align-items-center gap-2" id="profileToggleStatusBtn">
      <span class="material-symbols-outlined" style="font-size:18px;">${viewedUser.status === 'active' ? 'block' : 'check_circle'}</span>
      ${viewedUser.status === 'active' ? 'Disable' : 'Enable'}
    </button>`;
  }
  actions.innerHTML = html;

  document.getElementById('editProfileBtn')?.addEventListener('click', () => {
    document.getElementById('editName').value = viewedUser.name;
    document.getElementById('editEmail').value = viewedUser.email;
    document.getElementById('editPhone').value = viewedUser.phone || '';
    document.getElementById('editTitle').value = viewedUser.title || '';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('editProfileModal')).show();
  });

  document.getElementById('profileResetPwBtn')?.addEventListener('click', async () => {
    const ok = await showConfirm({ title: 'Reset password?', message: `Set ${viewedUser.name}'s password back to the default temporary password.`, confirmText: 'Reset' });
    if (!ok) return;
    await API.users.resetPassword(viewedUser.id, 'password123');
    showToast('Password reset to default.', 'success');
  });

  document.getElementById('profileToggleStatusBtn')?.addEventListener('click', async () => {
    const disabling = viewedUser.status === 'active';
    const ok = await showConfirm({
      title: disabling ? 'Disable this account?' : 'Enable this account?',
      message: disabling ? `${viewedUser.name} will no longer be able to sign in.` : `${viewedUser.name} will regain access immediately.`,
      confirmText: disabling ? 'Disable' : 'Enable', confirmClass: disabling ? 'btn-danger' : 'btn-primary'
    });
    if (!ok) return;
    await API.users.setStatus(viewedUser.id, disabling ? 'disabled' : 'active');
    showToast(`Account ${disabling ? 'disabled' : 'enabled'}.`, disabling ? 'warning' : 'success');
    viewedUser = await API.users.getById(viewedUser.id);
    renderProfileHeader();
  });
}

async function loadProfileData() {
  const [tasks, logs] = await Promise.all([API.tasks.getForUser(viewedUser.id), API.workLogs.getForUser(viewedUser.id)]);

  document.getElementById('pStatTotal').textContent = tasks.length;
  document.getElementById('pStatPending').textContent = tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
  document.getElementById('pStatCompleted').textContent = tasks.filter(t => t.status === 'Completed').length;
  document.getElementById('pStatOverdue').textContent = tasks.filter(t => isOverdue(t.dueDate, t.status)).length;

  const taskBody = document.getElementById('profileTasksTable');
  taskBody.innerHTML = tasks.length ? tasks.sort((a, b) => b.dueDate.localeCompare(a.dueDate)).map(t => `
    <tr><td>${escapeHtml(t.title)}</td><td>${priorityBadge(t.priority)}</td><td>${formatDateShort(t.dueDate)}</td><td>${statusPill(isOverdue(t.dueDate, t.status) ? 'Overdue' : t.status)}</td></tr>
  `).join('') : `<tr><td colspan="4" class="text-center text-muted-fw py-4">No tasks yet.</td></tr>`;

  const logBody = document.getElementById('profileLogsTable');
  logBody.innerHTML = logs.length ? logs.sort((a, b) => b.date.localeCompare(a.date)).map(l => `
    <tr><td>${formatDateShort(l.date)}</td><td>${escapeHtml(l.clientName)}</td><td>${escapeHtml(l.location)}</td><td>${escapeHtml(l.timeSpent || '—')}</td><td>${statusPill(l.status)}</td></tr>
  `).join('') : `<tr><td colspan="5" class="text-center text-muted-fw py-4">No work logs yet.</td></tr>`;
}

function wireEditForm() {
  document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const changes = {
      name: document.getElementById('editName').value.trim(),
      email: document.getElementById('editEmail').value.trim(),
      phone: document.getElementById('editPhone').value.trim(),
      title: document.getElementById('editTitle').value.trim()
    };
    await API.users.update(viewedUser.id, changes);
    viewedUser = await API.users.getById(viewedUser.id);
    bootstrap.Modal.getInstance(document.getElementById('editProfileModal')).hide();
    showToast('Profile updated.', 'success');
    renderProfileHeader();
  });
}
