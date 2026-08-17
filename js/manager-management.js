/**
 * js/manager-management.js — logic for manager-management.html (Super Admin only)
 */
let allManagersList = [], allEmployeesList = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = initPage('manager-management', 'super_admin');
  if (!user) return;

  await loadManagers();
  wireFilters();
  wireManagerForm();
  wireResetPassword();
  document.getElementById('openCreateManagerBtn').addEventListener('click', () => openManagerModal(null));
});

async function loadManagers() {
  [allManagersList, allEmployeesList] = await Promise.all([API.users.getAllManagers(), API.users.getAllEmployees()]);
  renderTable(allManagersList);
}

function teamSizeFor(managerId) {
  return allEmployeesList.filter(e => e.managerId === managerId).length;
}

function renderTable(list) {
  const tbody = document.getElementById('managerTableBody');
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4">
      <div class="empty-state"><span class="material-symbols-outlined">group_off</span><div>No managers match your filters.</div></div>
    </td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(m => `
    <tr>
      <td>
        <div class="d-flex align-items-center gap-2">
          <div class="avatar-sm" style="background:${m.avatarColor}">${getInitials(m.name)}</div>
          <div>
            <div class="fw-semibold">${escapeHtml(m.name)}</div>
            <div class="small text-muted-fw">${escapeHtml(m.title || '')}</div>
          </div>
        </div>
      </td>
      <td>
        <div class="small">${escapeHtml(m.email)}</div>
        <div class="small text-muted-fw">${escapeHtml(m.phone || '')}</div>
      </td>
      <td>${teamSizeFor(m.id)} employee${teamSizeFor(m.id) !== 1 ? 's' : ''}</td>
      <td>${statusPill(m.status)}</td>
      <td class="text-end">
        <div class="dropdown">
          <button class="btn btn-sm btn-light" data-bs-toggle="dropdown" aria-expanded="false">
            <span class="material-symbols-outlined" style="font-size:18px;">more_horiz</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><a class="dropdown-item edit-mgr-btn" href="#" data-id="${m.id}"><span class="material-symbols-outlined align-middle me-2" style="font-size:18px;">edit</span>Edit</a></li>
            <li><a class="dropdown-item reset-pw-btn" href="#" data-id="${m.id}" data-name="${escapeHtml(m.name)}"><span class="material-symbols-outlined align-middle me-2" style="font-size:18px;">key</span>Reset Password</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item ${m.status === 'active' ? 'text-danger' : 'text-success'} toggle-status-btn" href="#" data-id="${m.id}" data-status="${m.status}" data-name="${escapeHtml(m.name)}">
              <span class="material-symbols-outlined align-middle me-2" style="font-size:18px;">${m.status === 'active' ? 'block' : 'check_circle'}</span>
              ${m.status === 'active' ? 'Disable Account' : 'Enable Account'}
            </a></li>
          </ul>
        </div>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('.edit-mgr-btn').forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault();
    openManagerModal(allManagersList.find(x => x.id === btn.dataset.id));
  }));
  tbody.querySelectorAll('.reset-pw-btn').forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('resetPasswordUserId').value = btn.dataset.id;
    document.getElementById('resetPasswordUserName').textContent = btn.dataset.name;
    document.getElementById('newPasswordInput').value = 'password123';
    new bootstrap.Modal(document.getElementById('resetPasswordModal')).show();
  }));
  tbody.querySelectorAll('.toggle-status-btn').forEach(btn => btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const disabling = btn.dataset.status === 'active';
    const ok = await showConfirm({
      title: disabling ? 'Disable this account?' : 'Enable this account?',
      message: disabling ? `${btn.dataset.name} will no longer be able to sign in.` : `${btn.dataset.name} will regain access immediately.`,
      confirmText: disabling ? 'Disable' : 'Enable', confirmClass: disabling ? 'btn-danger' : 'btn-primary'
    });
    if (!ok) return;
    await API.users.setStatus(btn.dataset.id, disabling ? 'disabled' : 'active');
    showToast(`Account ${disabling ? 'disabled' : 'enabled'}.`, disabling ? 'warning' : 'success');
    await loadManagers();
    applyFilters();
  }));
}

function openManagerModal(mgr) {
  const form = document.getElementById('managerForm');
  form.reset();
  document.getElementById('mgrId').value = mgr ? mgr.id : '';
  document.getElementById('managerModalTitle').textContent = mgr ? 'Edit Manager' : 'Create Manager';
  document.getElementById('managerSubmitBtn').textContent = mgr ? 'Save Changes' : 'Create Manager';
  document.getElementById('mgrPasswordWrap').classList.toggle('d-none', !!mgr);
  if (mgr) {
    document.getElementById('mgrName').value = mgr.name;
    document.getElementById('mgrEmail').value = mgr.email;
    document.getElementById('mgrPhone').value = mgr.phone || '';
    document.getElementById('mgrTitle').value = mgr.title || '';
  }
  new bootstrap.Modal(document.getElementById('managerModal')).show();
}

function wireManagerForm() {
  document.getElementById('managerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('mgrId').value;
    const payload = {
      name: document.getElementById('mgrName').value.trim(),
      email: document.getElementById('mgrEmail').value.trim(),
      phone: document.getElementById('mgrPhone').value.trim(),
      title: document.getElementById('mgrTitle').value.trim()
    };
    if (id) {
      await API.users.update(id, payload);
      showToast('Manager details updated.', 'success');
    } else {
      payload.role = 'manager';
      payload.managerId = null;
      payload.password = document.getElementById('mgrPassword').value || 'password123';
      await API.users.create(payload);
      showToast('Manager account created.', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('managerModal')).hide();
    await loadManagers();
    applyFilters();
  });
}

function wireResetPassword() {
  document.getElementById('confirmResetPasswordBtn').addEventListener('click', async () => {
    const id = document.getElementById('resetPasswordUserId').value;
    const newPassword = document.getElementById('newPasswordInput').value.trim() || 'password123';
    await API.users.resetPassword(id, newPassword);
    bootstrap.Modal.getInstance(document.getElementById('resetPasswordModal')).hide();
    showToast('Password has been reset.', 'success');
  });
}

function wireFilters() {
  document.getElementById('filterSearch').addEventListener('input', debounce(applyFilters, 200));
  document.getElementById('filterStatus').addEventListener('change', applyFilters);
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    document.getElementById('filterSearch').value = '';
    document.getElementById('filterStatus').value = '';
    applyFilters();
  });
}

function applyFilters() {
  const q = document.getElementById('filterSearch').value.trim().toLowerCase();
  const status = document.getElementById('filterStatus').value;
  const filtered = allManagersList.filter(m => {
    if (q && !(m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))) return false;
    if (status && m.status !== status) return false;
    return true;
  });
  renderTable(filtered);
}
