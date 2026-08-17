/**
 * js/work-log.js — logic for work-log.html
 * Employees manage their own logs; managers/admins view & filter their team's logs.
 */
let currentUser, teamMembers = [], allLogs = [];

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = initPage('work-log', 'employee,manager,super_admin');
  if (!currentUser) return;

  document.getElementById('wlDate').value = todayISO();

  if (currentUser.role !== 'employee') {
    document.getElementById('employeeColHeader').style.display = '';
    document.getElementById('filterEmployeeWrap').style.display = '';
    document.getElementById('workLogSubtitle').textContent = 'Review detailed field visit records submitted by your team.';
    document.getElementById('openAddLogBtn').style.display = 'none';
    teamMembers = currentUser.role === 'manager' ? await API.users.getEmployeesForManager(currentUser.id) : await API.users.getAllEmployees();
    const sel = document.getElementById('filterEmployee');
    teamMembers.forEach(e => sel.insertAdjacentHTML('beforeend', `<option value="${e.id}">${escapeHtml(e.name)}</option>`));
  }

  await loadLogs();
  wireFilters();
  wireForm();

  // Support deep-linking with ?employee=ID
  const params = new URLSearchParams(window.location.search);
  if (params.get('employee')) {
    document.getElementById('filterEmployee').value = params.get('employee');
    applyFilters();
  }
});

async function loadLogs() {
  if (currentUser.role === 'employee') {
    allLogs = await API.workLogs.getForUser(currentUser.id);
  } else {
    const ids = teamMembers.map(e => e.id);
    allLogs = await API.workLogs.getForUsers(ids);
  }
  renderTable(allLogs);
}

function employeeName(id) {
  if (id === currentUser.id) return currentUser.name;
  const e = teamMembers.find(e => e.id === id);
  return e ? e.name : 'Unknown';
}

function renderTable(list) {
  const tbody = document.getElementById('workLogTableBody');
  const sorted = list.slice().sort((a, b) => (b.date + b.startTime).localeCompare(a.date + a.startTime));
  const showEmpCol = currentUser.role !== 'employee';
  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${showEmpCol ? 8 : 7}" class="text-center py-4">
      <div class="empty-state"><span class="material-symbols-outlined">work_off</span><div>No work logs match your filters.</div></div>
    </td></tr>`;
    return;
  }
  tbody.innerHTML = sorted.map(l => `
    <tr>
      ${showEmpCol ? `<td>${escapeHtml(employeeName(l.employeeId))}</td>` : ''}
      <td>${formatDateShort(l.date)}</td>
      <td class="fw-semibold">${escapeHtml(l.clientName)}</td>
      <td>${escapeHtml(l.location)}</td>
      <td class="small">${l.startTime} - ${l.endTime}</td>
      <td>${escapeHtml(l.timeSpent || '—')}</td>
      <td>${statusPill(l.status)}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-light view-log-btn" data-id="${l.id}" title="View / Edit">
          <span class="material-symbols-outlined" style="font-size:18px;">visibility</span>
        </button>
        ${currentUser.role === 'employee' ? `<button class="btn btn-sm btn-light text-danger delete-log-btn" data-id="${l.id}" title="Delete">
          <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
        </button>` : ''}
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('.view-log-btn').forEach(btn => btn.addEventListener('click', () => openLogModal(allLogs.find(x => x.id === btn.dataset.id))));
  tbody.querySelectorAll('.delete-log-btn').forEach(btn => btn.addEventListener('click', async () => {
    const ok = await showConfirm({ title: 'Delete this work log?', message: 'This action cannot be undone.', confirmText: 'Delete', confirmClass: 'btn-danger' });
    if (!ok) return;
    await API.workLogs.remove(btn.dataset.id);
    showToast('Work log deleted.', 'success');
    await loadLogs(); applyFilters();
  }));
}

function openLogModal(log) {
  const form = document.getElementById('workLogForm');
  form.reset();
  const readOnly = currentUser.role !== 'employee';
  document.getElementById('wlId').value = log ? log.id : '';
  document.getElementById('workLogModalTitle').textContent = log ? (readOnly ? 'View Work Log' : 'Edit Work Log') : 'Add Work Log';
  document.getElementById('workLogSubmitBtn').style.display = readOnly ? 'none' : '';

  if (log) {
    document.getElementById('wlDate').value = log.date;
    document.getElementById('wlStartTime').value = log.startTime;
    document.getElementById('wlEndTime').value = log.endTime;
    document.getElementById('wlClient').value = log.clientName;
    document.getElementById('wlLocation').value = log.location;
    document.getElementById('wlDescription').value = log.description;
    document.getElementById('wlIssue').value = log.issueIdentified || '';
    document.getElementById('wlAction').value = log.actionTaken || '';
    document.getElementById('wlTimeSpent').value = log.timeSpent || '';
    document.getElementById('wlStatus').value = log.status;
    document.getElementById('wlRemarks').value = log.remarks || '';
    document.getElementById('wlExistingAttachment').textContent = log.attachment ? `Current file: ${log.attachment}` : 'No attachment on file.';
  } else {
    document.getElementById('wlDate').value = todayISO();
    document.getElementById('wlExistingAttachment').textContent = '';
  }

  form.querySelectorAll('input, textarea, select').forEach(el => { if (el.type !== 'hidden') el.disabled = readOnly; });

  new bootstrap.Modal(document.getElementById('workLogModal')).show();
}

function wireForm() {
  document.getElementById('openAddLogBtn').addEventListener('click', () => openLogModal(null));

  document.getElementById('workLogForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('wlId').value;
    const fileInput = document.getElementById('wlAttachment');
    const payload = {
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
      remarks: document.getElementById('wlRemarks').value.trim()
    };
    if (fileInput.files[0]) payload.attachment = fileInput.files[0].name;

    if (id) {
      await API.workLogs.update(id, payload);
      showToast('Work log updated.', 'success');
    } else {
      payload.employeeId = currentUser.id;
      await API.workLogs.create(payload);
      showToast('Work log added.', 'success');
    }
    bootstrap.Modal.getInstance(document.getElementById('workLogModal')).hide();
    await loadLogs();
    applyFilters();
  });
}

function wireFilters() {
  ['filterClient', 'filterDateFrom', 'filterDateTo'].forEach(id =>
    document.getElementById(id).addEventListener('input', debounce(applyFilters, 200)));
  document.getElementById('filterStatus').addEventListener('change', applyFilters);
  document.getElementById('filterEmployee')?.addEventListener('change', applyFilters);
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    document.querySelectorAll('.filter-bar input, .filter-bar select').forEach(el => el.value = '');
    applyFilters();
  });
}

function applyFilters() {
  const client = document.getElementById('filterClient').value.trim().toLowerCase();
  const from = document.getElementById('filterDateFrom').value;
  const to = document.getElementById('filterDateTo').value;
  const status = document.getElementById('filterStatus').value;
  const emp = document.getElementById('filterEmployee')?.value;

  const filtered = allLogs.filter(l => {
    if (client && !l.clientName.toLowerCase().includes(client)) return false;
    if (from && l.date < from) return false;
    if (to && l.date > to) return false;
    if (status && l.status !== status) return false;
    if (emp && l.employeeId !== emp) return false;
    return true;
  });
  renderTable(filtered);
}
