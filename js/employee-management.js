/**
 * js/employee-management.js — logic for employee-management.html
 * Accessible to managers (their own team) and super admins (all employees).
 */
let currentUser, allEmployees = [], allManagers = [];

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = initPage('employee-management', 'manager,super_admin');
  if (!currentUser) return;

  allManagers = await API.users.getAllManagers();
  populateManagerSelects();

  if (currentUser.role === 'manager') {
    document.getElementById('filterManagerWrap').classList.add('d-none');
  }

  await loadEmployees();
  wireFilters();
  wireEmployeeForm();
  wireResetPassword();

  document.getElementById('openCreateEmployeeBtn').addEventListener('click', () => openEmployeeModal(null));
});

function populateManagerSelects() {
  const filterSelect = document.getElementById('filterManager');
  const formSelect = document.getElementById('empManager');
  allManagers.forEach(m => {
    filterSelect.insertAdjacentHTML('beforeend', `<option value="${m.id}">${escapeHtml(m.name)}</option>`);
    formSelect.insertAdjacentHTML('beforeend', `<option value="${m.id}">${escapeHtml(m.name)}</option>`);
  });
  if (currentUser.role === 'manager') {
    formSelect.value = currentUser.id;
    formSelect.disabled = true;
  }
}

async function loadEmployees() {
  allEmployees = currentUser.role === 'manager'
    ? await API.users.getEmployeesForManager(currentUser.id)
    : await API.users.getAllEmployees();
  renderTable(allEmployees);
}

function managerName(id) {
  const m = allManagers.find(m => m.id === id);
  return m ? m.name : '—';
}

function renderTable(list) {
  const tbody = document.getElementById('employeeTableBody');
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4">
      <div class="empty-state"><span class="material-symbols-outlined">group_off</span><div>No employees match your filters.</div></div>
    </td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(emp => `
    <tr>
      <td>
        <a href="employee-profile.html?id=${emp.id}" class="d-flex align-items-center gap-2 text-decoration-none text-reset">
          <div class="avatar-sm" style="background:${emp.avatarColor}">${getInitials(emp.name)}</div>
          <div>
            <div class="fw-semibold">${escapeHtml(emp.name)}</div>
            <div class="small text-muted-fw">${escapeHtml(emp.title || '')}</div>
          </div>
        </a>
      </td>
      <td>
        <div class="small">${escapeHtml(emp.email)}</div>
        <div class="small text-muted-fw">${escapeHtml(emp.phone || '')}</div>
      </td>
      <td>${escapeHtml(managerName(emp.managerId))}</td>
      <td>${escapeHtml(emp.title || '—')}</td>
      <td>${statusPill(emp.status)}</td>
      <td class="text-end">
        <div class="dropdown">
          <button class="btn btn-sm btn-light" data-bs-toggle="dropdown" aria-expanded="false">
            <span class="material-symbols-outlined" style="font-size:18px;">more_horiz</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            <li><a class="dropdown-item" href="employee-profile.html?id=${emp.id}"><span class="material-symbols-outlined align-middle me-2" style="font-size:18px;">visibility</span>View Profile</a></li>
            <li><a class="dropdown-item edit-emp-btn" href="#" data-id="${emp.id}"><span class="material-symbols-outlined align-middle me-2" style="font-size:18px;">edit</span>Edit</a></li>
            <li><a class="dropdown-item reset-pw-btn" href="#" data-id="${emp.id}" data-name="${escapeHtml(emp.name)}"><span class="material-symbols-outlined align-middle me-2" style="font-size:18px;">key</span>Reset Password</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><a class="dropdown-item ${emp.status === 'active' ? 'text-danger' : 'text-success'} toggle-status-btn" href="#" data-id="${emp.id}" data-status="${emp.status}" data-name="${escapeHtml(emp.name)}">
              <span class="material-symbols-outlined align-middle me-2" style="font-size:18px;">${emp.status === 'active' ? 'block' : 'check_circle'}</span>
              ${emp.status === 'active' ? 'Disable Account' : 'Enable Account'}
            </a></li>
          </ul>
        </div>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('.edit-emp-btn').forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault();
    openEmployeeModal(allEmployees.find(x => x.id === btn.dataset.id));
  }));
  tbody.querySelectorAll('.reset-pw-btn').forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('resetPasswordUserId').value = btn.dataset.id;
    document.getElementById('resetPasswordUserName').textContent = btn.dataset.name;
    document.getElementById('newPasswordInput').value = 'password123';
    bootstrap.Modal.getOrCreateInstance(document.getElementById('resetPasswordModal')).show();
  }));
  tbody.querySelectorAll('.toggle-status-btn').forEach(btn => btn.addEventListener('click', async (e) => {
    e.preventDefault();
    const disabling = btn.dataset.status === 'active';
    const ok = await showConfirm({
      title: disabling ? 'Disable this account?' : 'Enable this account?',
      message: disabling
        ? `${btn.dataset.name} will no longer be able to sign in until re-enabled.`
        : `${btn.dataset.name} will regain access immediately.`,
      confirmText: disabling ? 'Disable' : 'Enable',
      confirmClass: disabling ? 'btn-danger' : 'btn-primary'
    });
    if (!ok) return;
    await API.users.setStatus(btn.dataset.id, disabling ? 'disabled' : 'active');
    showToast(`Account ${disabling ? 'disabled' : 'enabled'}.`, disabling ? 'warning' : 'success');
    await loadEmployees();
    applyFilters();
  }));
}

function openEmployeeModal(emp) {
  const form = document.getElementById('employeeForm');
  form.reset();
  document.getElementById('empId').value = emp ? emp.id : '';
  document.getElementById('employeeModalTitle').textContent = emp ? 'Edit Employee' : 'Create Employee';
  document.getElementById('employeeSubmitBtn').textContent = emp ? 'Save Changes' : 'Create Employee';
  document.getElementById('empPasswordWrap').classList.toggle('d-none', !!emp);

  if (emp) {
    document.getElementById('empName').value = emp.name;
    document.getElementById('empEmail').value = emp.email;
    document.getElementById('empPhone').value = emp.phone || '';
    document.getElementById('empTitle').value = emp.title || '';
    if (currentUser.role !== 'manager') document.getElementById('empManager').value = emp.managerId || '';
  } else if (currentUser.role === 'manager') {
    document.getElementById('empManager').value = currentUser.id;
  }
  bootstrap.Modal.getOrCreateInstance(document.getElementById('employeeModal')).show();
}

function wireEmployeeForm() {
  document.getElementById('employeeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('empId').value;
    const payload = {
      name: document.getElementById('empName').value.trim(),
      email: document.getElementById('empEmail').value.trim(),
      phone: document.getElementById('empPhone').value.trim(),
      title: document.getElementById('empTitle').value.trim(),
      managerId: document.getElementById('empManager').value
    };
    if (id) {
      await API.users.update(id, payload);
      showToast('Employee details updated.', 'success');
    } else {
      payload.role = 'employee';
      payload.password = document.getElementById('empPassword').value || 'password123';
      await API.users.create(payload);
      showToast('Employee account created.', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
    await loadEmployees();
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
  document.getElementById('filterManager').addEventListener('change', applyFilters);
  document.getElementById('filterStatus').addEventListener('change', applyFilters);
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    document.getElementById('filterSearch').value = '';
    document.getElementById('filterManager').value = '';
    document.getElementById('filterStatus').value = '';
    applyFilters();
  });
}

function applyFilters() {
  const q = document.getElementById('filterSearch').value.trim().toLowerCase();
  const mgr = document.getElementById('filterManager').value;
  const status = document.getElementById('filterStatus').value;
  const filtered = allEmployees.filter(emp => {
    if (q && !(emp.name.toLowerCase().includes(q) || emp.email.toLowerCase().includes(q))) return false;
    if (mgr && emp.managerId !== mgr) return false;
    if (status && emp.status !== status) return false;
    return true;
  });
  renderTable(filtered);
}
