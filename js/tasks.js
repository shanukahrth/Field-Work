/**
 * js/tasks.js — logic for tasks.html
 */
let currentUser, teamMembers = [], allTasks = [], kanbanSortables = [];

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = initPage('tasks', 'employee,manager,super_admin');
  if (!currentUser) return;

  document.getElementById('tDueDate').value = todayISO();

  if (currentUser.role !== 'employee') {
    document.getElementById('taskEmpColHeader').style.display = '';
    document.getElementById('filterEmployeeWrap').style.display = '';
    teamMembers = currentUser.role === 'manager' ? await API.users.getEmployeesForManager(currentUser.id) : await API.users.getAllEmployees();
    const filterSel = document.getElementById('filterEmployee');
    const formSel = document.getElementById('tAssignedTo');
    teamMembers.forEach(e => {
      filterSel.insertAdjacentHTML('beforeend', `<option value="${e.id}">${escapeHtml(e.name)}</option>`);
      formSel.insertAdjacentHTML('beforeend', `<option value="${e.id}">${escapeHtml(e.name)}</option>`);
    });
  } else {
    // Hidden fields must not stay "required" or the browser will silently
    // block form submission without showing any validation message.
    document.getElementById('tAssignedWrap').style.display = 'none';
    document.getElementById('tAssignedTo').required = false;
  }

  await loadTasks();
  wireFilters();
  wireForm();
  wireViewToggle();

  // Support ?status= and ?q= deep links from other pages
  const params = new URLSearchParams(window.location.search);
  if (params.get('status')) document.getElementById('filterStatus').value = params.get('status');
  if (params.get('q')) document.getElementById('filterSearch').value = params.get('q');
  if (params.get('status') || params.get('q')) applyFilters();
});

async function loadTasks() {
  allTasks = currentUser.role === 'employee'
    ? await API.tasks.getForUser(currentUser.id)
    : await API.tasks.getForUsers(teamMembers.map(e => e.id));
  applyFilters();
}

function employeeName(id) {
  if (id === currentUser.id) return currentUser.name;
  const e = teamMembers.find(e => e.id === id);
  return e ? e.name : 'Unknown';
}

/* ---------------- Filtering ---------------- */
function wireFilters() {
  document.getElementById('filterSearch').addEventListener('input', debounce(applyFilters, 200));
  document.getElementById('filterEmployee')?.addEventListener('change', applyFilters);
  document.getElementById('filterPriority').addEventListener('change', applyFilters);
  document.getElementById('filterStatus').addEventListener('change', applyFilters);
  document.getElementById('filterDateFrom').addEventListener('change', applyFilters);
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    document.querySelectorAll('.filter-bar input, .filter-bar select').forEach(el => el.value = '');
    applyFilters();
  });
}

function getFiltered() {
  const q = document.getElementById('filterSearch').value.trim().toLowerCase();
  const emp = document.getElementById('filterEmployee')?.value;
  const priority = document.getElementById('filterPriority').value;
  const status = document.getElementById('filterStatus').value;
  const from = document.getElementById('filterDateFrom').value;
  return allTasks.filter(t => {
    if (q && !t.title.toLowerCase().includes(q) && !(t.description || '').toLowerCase().includes(q)) return false;
    if (emp && t.assignedTo !== emp) return false;
    if (priority && t.priority !== priority) return false;
    if (status && t.status !== status) return false;
    if (from && t.dueDate < from) return false;
    return true;
  });
}

function applyFilters() {
  const filtered = getFiltered();
  renderTable(filtered);
  renderKanban(filtered);
}

/* ---------------- Table view ---------------- */
function renderTable(list) {
  const tbody = document.getElementById('taskTableBody');
  const showEmpCol = currentUser.role !== 'employee';
  const sorted = list.slice().sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  if (sorted.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${showEmpCol ? 7 : 6}" class="text-center py-4">
      <div class="empty-state"><span class="material-symbols-outlined">task</span><div>No tasks match your filters.</div></div>
    </td></tr>`;
    return;
  }
  tbody.innerHTML = sorted.map(t => `
    <tr>
      <td>
        <div class="fw-semibold">${escapeHtml(t.title)}</div>
        <div class="small text-muted-fw">${escapeHtml(t.description || '')}</div>
      </td>
      ${showEmpCol ? `<td><div class="d-flex align-items-center gap-2"><div class="avatar-sm" style="background:#3457D5">${getInitials(employeeName(t.assignedTo))}</div>${escapeHtml(employeeName(t.assignedTo))}</div></td>` : ''}
      <td>${priorityBadge(t.priority)}</td>
      <td class="${isOverdue(t.dueDate, t.status) ? 'text-danger fw-semibold' : ''}">${formatDateShort(t.dueDate)}</td>
      <td>${statusPill(isOverdue(t.dueDate, t.status) ? 'Overdue' : t.status)}</td>
      <td>${t.reminder ? '<span class="material-symbols-outlined text-primary" style="font-size:18px;">notifications_active</span>' : '<span class="material-symbols-outlined text-muted-fw" style="font-size:18px;">notifications_off</span>'}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-light edit-task-btn" data-id="${t.id}"><span class="material-symbols-outlined" style="font-size:18px;">edit</span></button>
        <button class="btn btn-sm btn-light text-danger delete-task-btn" data-id="${t.id}"><span class="material-symbols-outlined" style="font-size:18px;">delete</span></button>
      </td>
    </tr>`).join('');

  tbody.querySelectorAll('.edit-task-btn').forEach(btn => btn.addEventListener('click', () => openTaskModal(allTasks.find(x => x.id === btn.dataset.id))));
  tbody.querySelectorAll('.delete-task-btn').forEach(btn => btn.addEventListener('click', () => deleteTask(btn.dataset.id)));
}

/* ---------------- Kanban view ---------------- */
function renderKanban(list) {
  const cols = { 'Pending': 'kanbanPending', 'In Progress': 'kanbanInProgress', 'Completed': 'kanbanCompleted', 'Cancelled': 'kanbanCancelled' };
  Object.entries(cols).forEach(([status, elId]) => {
    const items = list.filter(t => t.status === status);
    document.getElementById(`kanbanCount${status.replace(' ', '')}`).textContent = items.length;
    const el = document.getElementById(elId);
    el.innerHTML = items.length ? items.map(t => `
      <div class="kanban-card" data-id="${t.id}">
        <div class="d-flex justify-content-between align-items-start">
          <div class="fw-semibold small">${escapeHtml(t.title)}</div>
          <button class="btn btn-sm btn-light p-1 edit-task-btn" data-id="${t.id}"><span class="material-symbols-outlined" style="font-size:16px;">edit</span></button>
        </div>
        ${currentUser.role !== 'employee' ? `<div class="small text-muted-fw">${escapeHtml(employeeName(t.assignedTo))}</div>` : ''}
        <div class="d-flex justify-content-between align-items-center mt-2">
          ${priorityBadge(t.priority)}
          <span class="small ${isOverdue(t.dueDate, t.status) ? 'text-danger fw-semibold' : 'text-muted-fw'}">${formatDateShort(t.dueDate)}</span>
        </div>
      </div>`).join('') : `<div class="text-center text-muted-fw small py-3">No tasks</div>`;
  });

  document.querySelectorAll('#kanbanView .edit-task-btn').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    openTaskModal(allTasks.find(x => x.id === btn.dataset.id));
  }));

  kanbanSortables.forEach(s => s.destroy());
  kanbanSortables = [];
  Object.values(cols).forEach(elId => {
    const el = document.getElementById(elId);
    kanbanSortables.push(new Sortable(el, {
      group: 'kanban', animation: 150, ghostClass: 'sortable-ghost',
      onEnd: async (evt) => {
        const taskId = evt.item.dataset.id;
        const newStatus = evt.to.dataset.status;
        await API.tasks.update(taskId, { status: newStatus });
        showToast(`Task moved to ${newStatus}.`, 'success');
        await loadTasks();
      }
    }));
  });
}

/* ---------------- View toggle ---------------- */
function wireViewToggle() {
  document.getElementById('viewTableBtn').addEventListener('click', () => {
    document.getElementById('tableView').classList.remove('d-none');
    document.getElementById('kanbanView').classList.add('d-none');
    document.getElementById('viewTableBtn').classList.add('active');
    document.getElementById('viewKanbanBtn').classList.remove('active');
  });
  document.getElementById('viewKanbanBtn').addEventListener('click', () => {
    document.getElementById('tableView').classList.add('d-none');
    document.getElementById('kanbanView').classList.remove('d-none');
    document.getElementById('viewKanbanBtn').classList.add('active');
    document.getElementById('viewTableBtn').classList.remove('active');
  });
}

/* ---------------- Add / Edit / Delete ---------------- */
function openTaskModal(task) {
  const form = document.getElementById('taskForm');
  form.reset();
  document.getElementById('tId').value = task ? task.id : '';
  document.getElementById('taskModalTitle').textContent = task ? 'Edit Task' : 'Add Task';
  if (task) {
    document.getElementById('tTitle').value = task.title;
    document.getElementById('tDescription').value = task.description || '';
    document.getElementById('tPriority').value = task.priority;
    document.getElementById('tDueDate').value = task.dueDate;
    document.getElementById('tStatus').value = task.status;
    document.getElementById('tReminder').checked = !!task.reminder;
    if (currentUser.role !== 'employee') document.getElementById('tAssignedTo').value = task.assignedTo;
  } else {
    document.getElementById('tDueDate').value = todayISO();
    if (currentUser.role !== 'employee' && teamMembers.length) document.getElementById('tAssignedTo').value = teamMembers[0].id;
  }
  bootstrap.Modal.getOrCreateInstance(document.getElementById('taskModal')).show();
}

function wireForm() {
  document.getElementById('openAddTaskBtn').addEventListener('click', () => openTaskModal(null));
  document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('tId').value;
    const payload = {
      title: document.getElementById('tTitle').value.trim(),
      description: document.getElementById('tDescription').value.trim(),
      priority: document.getElementById('tPriority').value,
      dueDate: document.getElementById('tDueDate').value,
      status: document.getElementById('tStatus').value,
      reminder: document.getElementById('tReminder').checked,
      assignedTo: currentUser.role === 'employee' ? currentUser.id : document.getElementById('tAssignedTo').value
    };
    if (id) {
      await API.tasks.update(id, payload);
      showToast('Task updated.', 'success');
    } else {
      payload.createdBy = currentUser.id;
      const created = await API.tasks.create(payload);
      showToast('Task added.', 'success');
      if (currentUser.role === 'manager') notifyManagerTaskCreated(created);
    }
    bootstrap.Modal.getInstance(document.getElementById('taskModal')).hide();
    await loadTasks();
  });
}

/**
 * Emails the assigned employee and every Super Admin when a manager creates
 * a task. No-op (silently) if EmailJS isn't configured — see js/app.js.
 */
async function notifyManagerTaskCreated(task) {
  try {
    const [assignee, admins] = await Promise.all([
      API.users.getById(task.assignedTo),
      API.users.getAllSuperAdmins()
    ]);
    const recipients = new Set();
    if (assignee) recipients.add(assignee.email);
    admins.forEach((a) => recipients.add(a.email));
    const templateParams = {
      task_title: task.title,
      task_description: task.description || '(no description)',
      task_priority: task.priority,
      task_due_date: task.dueDate,
      assignee_name: assignee ? assignee.name : '',
      manager_name: currentUser.name
    };
    await Promise.all([...recipients].map((email) => sendNotificationEmail(email, templateParams)));
  } catch (err) {
    console.error('Task-created notification failed:', err);
  }
}

async function deleteTask(id) {
  const ok = await showConfirm({ title: 'Delete this task?', message: 'This action cannot be undone.', confirmText: 'Delete', confirmClass: 'btn-danger' });
  if (!ok) return;
  await API.tasks.remove(id);
  showToast('Task deleted.', 'success');
  await loadTasks();
}
