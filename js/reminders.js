/**
 * js/reminders.js — logic for reminders.html
 * Includes a lightweight polling loop that fires a browser notification
 * (and a dashboard toast) the moment a reminder's time arrives.
 */
let currentUser, teamMembers = [], firedIds = new Set();

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = initPage('reminders', 'employee,manager');
  if (!currentUser) return;

  if (currentUser.role === 'manager') {
    teamMembers = await API.users.getEmployeesForManager(currentUser.id);
    document.getElementById('rForUserWrap').style.display = '';
    const sel = document.getElementById('rForUser');
    sel.innerHTML = `<option value="${currentUser.id}">Myself</option>` +
      teamMembers.map(e => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
  }

  setupNotificationBanner();
  await loadReminders();
  wireForm();

  setInterval(checkDueReminders, 20000); // poll every 20s for demo purposes
});

function setupNotificationBanner() {
  if ('Notification' in window && Notification.permission === 'default') {
    document.getElementById('notifPermissionBanner').classList.remove('d-none');
    document.getElementById('enableNotifBtn').addEventListener('click', async () => {
      await Notification.requestPermission();
      document.getElementById('notifPermissionBanner').classList.add('d-none');
    });
  }
}

async function loadReminders() {
  const reminders = currentUser.role === 'employee'
    ? await API.reminders.getForUser(currentUser.id)
    : await API.reminders.getForUser(currentUser.id).then(async mine => {
        const teamOnes = await Promise.all(teamMembers.map(e => API.reminders.getForUser(e.id)));
        return [...mine, ...teamOnes.flat()];
      });

  const now = new Date();
  const upcoming = reminders.filter(r => new Date(r.datetime) >= now).sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  const past = reminders.filter(r => new Date(r.datetime) < now).sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

  renderList('upcomingRemindersList', upcoming, true);
  renderList('pastRemindersList', past, false);
}

function ownerLabel(r) {
  if (r.forUser === currentUser.id) return 'You';
  const e = teamMembers.find(e => e.id === r.forUser);
  return e ? e.name : 'Team member';
}

function renderList(containerId, reminders, actionable) {
  const container = document.getElementById(containerId);
  if (reminders.length === 0) {
    container.innerHTML = `<div class="empty-state py-4"><span class="material-symbols-outlined">notifications_off</span><div class="small">Nothing here yet.</div></div>`;
    return;
  }
  container.innerHTML = reminders.map(r => `
    <div class="accent-bar a-reminder py-2 mb-3 d-flex justify-content-between align-items-start gap-2">
      <div>
        <div class="fw-semibold small">${escapeHtml(r.title)} ${currentUser.role === 'manager' ? `<span class="pill pill-gray ms-1">${escapeHtml(ownerLabel(r))}</span>` : ''}</div>
        <div class="small text-muted-fw">${escapeHtml(r.message || '')}</div>
        <div class="small text-muted-fw mt-1"><span class="material-symbols-outlined align-middle" style="font-size:14px;">schedule</span> ${formatDateTime(r.datetime)}</div>
      </div>
      ${actionable ? `<button class="btn btn-sm btn-light dismiss-reminder-btn" data-id="${r.id}" title="Dismiss"><span class="material-symbols-outlined" style="font-size:16px;">close</span></button>` : ''}
    </div>`).join('');

  container.querySelectorAll('.dismiss-reminder-btn').forEach(btn => btn.addEventListener('click', async () => {
    await API.reminders.remove(btn.dataset.id);
    showToast('Reminder dismissed.', 'success');
    await loadReminders();
  }));
}

async function checkDueReminders() {
  const reminders = await API.reminders.getForUser(currentUser.id);
  const now = new Date();
  reminders.forEach(r => {
    const due = new Date(r.datetime);
    if (!firedIds.has(r.id) && due <= now && (now - due) < 5 * 60000) {
      firedIds.add(r.id);
      showToast(`Reminder: ${r.title}`, 'info');
      pushBrowserNotification(r.title, r.message);
    }
  });
}

function wireForm() {
  document.getElementById('reminderForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const forUser = currentUser.role === 'manager' ? document.getElementById('rForUser').value : currentUser.id;
    await API.reminders.create({
      title: document.getElementById('rTitle').value.trim(),
      message: document.getElementById('rMessage').value.trim(),
      datetime: document.getElementById('rDatetime').value,
      createdBy: currentUser.id,
      forUser
    });
    bootstrap.Modal.getInstance(document.getElementById('reminderModal')).hide();
    e.target.reset();
    showToast('Reminder created.', 'success');
    await loadReminders();
  });
}
