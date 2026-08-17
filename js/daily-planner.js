/**
 * js/daily-planner.js — logic for daily-planner.html
 */
let currentUser, selectedDate, currentItems = [], sortableInstance;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = initPage('daily-planner', 'employee');
  if (!currentUser) return;

  const params = new URLSearchParams(window.location.search);
  selectedDate = params.get('date') || todayISO();
  document.getElementById('plannerDateInput').value = selectedDate;

  await loadPlannerForDate();
  wireControls();
});

function shiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

async function loadPlannerForDate() {
  document.getElementById('plannerDateLabel').textContent = formatDateLong(selectedDate);
  document.getElementById('plannerDateInput').value = selectedDate;
  currentItems = await API.planner.getForUserAndDate(currentUser.id, selectedDate);
  renderList();
  renderCarriedOver();
}

function renderProgress() {
  const total = currentItems.length;
  const done = currentItems.filter(i => i.completed).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('plannerProgressLabel').textContent = `${done} of ${total} complete`;
  document.getElementById('plannerProgressPct').textContent = `${pct}%`;
  document.getElementById('plannerProgressBar').style.width = `${pct}%`;
}

function renderList() {
  renderProgress();
  const container = document.getElementById('plannerList');
  if (currentItems.length === 0) {
    container.innerHTML = `<div class="empty-state py-4">
      <span class="material-symbols-outlined d-block mb-2">playlist_add</span>
      <div class="small">No checklist items for this day yet. Add one below.</div>
    </div>`;
    return;
  }
  container.innerHTML = currentItems.map(item => `
    <div class="planner-item ${item.completed ? 'completed' : ''}" data-id="${item.id}">
      <span class="material-symbols-outlined drag-handle">drag_indicator</span>
      <div class="form-check mb-0">
        <input class="form-check-input planner-check" type="checkbox" data-id="${item.id}" ${item.completed ? 'checked' : ''}>
      </div>
      <div class="flex-grow-1">
        <div class="planner-item-title">${escapeHtml(item.title)}</div>
        ${item.carriedFrom ? `<div class="small text-muted-fw"><span class="material-symbols-outlined align-middle" style="font-size:14px;">redo</span> Carried from ${formatDateShort(item.carriedFrom)}</div>` : ''}
      </div>
      <div class="d-flex gap-1">
        ${!item.completed ? `<button class="btn btn-sm btn-light carry-forward-btn" data-id="${item.id}" title="Carry forward to tomorrow">
          <span class="material-symbols-outlined" style="font-size:18px;">redo</span>
        </button>` : ''}
        <button class="btn btn-sm btn-light edit-item-btn" data-id="${item.id}" title="Edit">
          <span class="material-symbols-outlined" style="font-size:18px;">edit</span>
        </button>
        <button class="btn btn-sm btn-light text-danger delete-item-btn" data-id="${item.id}" title="Delete">
          <span class="material-symbols-outlined" style="font-size:18px;">delete</span>
        </button>
      </div>
    </div>`).join('');

  container.querySelectorAll('.planner-check').forEach(cb => cb.addEventListener('change', async (e) => {
    await API.planner.update(e.target.dataset.id, { completed: e.target.checked });
    showToast(e.target.checked ? 'Item marked complete.' : 'Item marked incomplete.', 'success');
    await loadPlannerForDate();
  }));
  container.querySelectorAll('.edit-item-btn').forEach(btn => btn.addEventListener('click', () => {
    const item = currentItems.find(i => i.id === btn.dataset.id);
    document.getElementById('editItemId').value = item.id;
    document.getElementById('editItemTitle').value = item.title;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('editItemModal')).show();
  }));
  container.querySelectorAll('.delete-item-btn').forEach(btn => btn.addEventListener('click', async () => {
    const ok = await showConfirm({ title: 'Remove this item?', message: 'It will be removed from this day\u2019s checklist.', confirmText: 'Remove', confirmClass: 'btn-danger' });
    if (!ok) return;
    await API.planner.remove(btn.dataset.id);
    showToast('Item removed.', 'success');
    await loadPlannerForDate();
  }));
  container.querySelectorAll('.carry-forward-btn').forEach(btn => btn.addEventListener('click', async () => {
    const item = currentItems.find(i => i.id === btn.dataset.id);
    const nextDay = shiftDate(selectedDate, 1);
    await API.planner.create({
      employeeId: currentUser.id, date: nextDay, title: item.title,
      order: 999, completed: false, taskId: item.taskId || null, carriedFrom: selectedDate
    });
    await API.planner.remove(item.id);
    showToast(`Carried forward to ${formatDateShort(nextDay)}.`, 'success');
    await loadPlannerForDate();
  }));

  // Drag-and-drop reordering
  if (sortableInstance) sortableInstance.destroy();
  sortableInstance = new Sortable(container, {
    handle: '.drag-handle',
    animation: 150,
    ghostClass: 'sortable-ghost',
    onEnd: async () => {
      const orderedIds = Array.from(container.querySelectorAll('.planner-item')).map(el => el.dataset.id);
      await API.planner.reorder(orderedIds);
    }
  });
}

async function renderCarriedOver() {
  const yesterday = shiftDate(selectedDate, -1);
  const carried = currentItems.filter(i => i.carriedFrom === yesterday);
  const container = document.getElementById('carriedOverList');
  if (carried.length === 0) {
    container.innerHTML = `<div class="text-center text-muted-fw py-3 small">Nothing carried over.</div>`;
    return;
  }
  container.innerHTML = carried.map(i => `
    <div class="accent-bar a-overdue py-2 mb-2">
      <div class="small fw-semibold">${escapeHtml(i.title)}</div>
      <div class="small text-muted-fw">From ${formatDateShort(yesterday)}</div>
    </div>`).join('');
}

function wireControls() {
  document.getElementById('prevDayBtn').addEventListener('click', () => { selectedDate = shiftDate(selectedDate, -1); loadPlannerForDate(); });
  document.getElementById('nextDayBtn').addEventListener('click', () => { selectedDate = shiftDate(selectedDate, 1); loadPlannerForDate(); });
  document.getElementById('todayBtn').addEventListener('click', () => { selectedDate = todayISO(); loadPlannerForDate(); });
  document.getElementById('plannerDateInput').addEventListener('change', (e) => { selectedDate = e.target.value; loadPlannerForDate(); });

  document.getElementById('addPlannerItemForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('newItemTitle');
    const title = input.value.trim();
    if (!title) return;
    await API.planner.create({ employeeId: currentUser.id, date: selectedDate, title, order: currentItems.length + 1 });
    input.value = '';
    showToast('Checklist item added.', 'success');
    await loadPlannerForDate();
  });

  document.getElementById('editItemForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editItemId').value;
    const title = document.getElementById('editItemTitle').value.trim();
    await API.planner.update(id, { title });
    bootstrap.Modal.getInstance(document.getElementById('editItemModal')).hide();
    showToast('Item updated.', 'success');
    await loadPlannerForDate();
  });
}
