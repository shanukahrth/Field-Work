/**
 * ============================================================================
 * FWMS APP SHELL  (js/app.js)
 * ----------------------------------------------------------------------------
 * Shared, reusable UI: sidebar navigation, topbar, theme toggle, toasts,
 * formatting helpers and small utilities used across every page.
 * Include AFTER data.js and auth.js, BEFORE the page-specific script.
 * ============================================================================
 */

/* ---------------------------- NAV CONFIGURATION ---------------------------- */
const NAV_CONFIG = {
  employee: [
    { section: 'Workspace' },
    { label: 'Dashboard', icon: 'dashboard', href: 'employee-dashboard.html', id: 'employee-dashboard' },
    { label: 'Daily Planner', icon: 'checklist', href: 'daily-planner.html', id: 'daily-planner' },
    { label: 'Tasks', icon: 'task_alt', href: 'tasks.html', id: 'tasks' },
    { label: 'Work Logs', icon: 'work_history', href: 'work-log.html', id: 'work-log' },
    { section: 'Planning' },
    { label: 'Calendar', icon: 'calendar_month', href: 'calendar.html', id: 'calendar' },
    { label: 'Reminders', icon: 'notifications_active', href: 'reminders.html', id: 'reminders' },
    { label: 'Reports', icon: 'monitoring', href: 'reports.html', id: 'reports' },
    { section: 'Account' },
    { label: 'My Profile', icon: 'account_circle', href: 'employee-profile.html?id=self', id: 'employee-profile' }
  ],
  manager: [
    { section: 'Overview' },
    { label: 'Dashboard', icon: 'dashboard', href: 'manager-dashboard.html', id: 'manager-dashboard' },
    { label: 'Employees', icon: 'groups', href: 'employee-management.html', id: 'employee-management' },
    { section: 'Operations' },
    { label: 'Tasks', icon: 'task_alt', href: 'tasks.html', id: 'tasks' },
    { label: 'Work Logs', icon: 'work_history', href: 'work-log.html', id: 'work-log' },
    { label: 'Calendar', icon: 'calendar_month', href: 'calendar.html', id: 'calendar' },
    { label: 'Reminders', icon: 'notifications_active', href: 'reminders.html', id: 'reminders' },
    { section: 'Insights' },
    { label: 'Reports', icon: 'monitoring', href: 'reports.html', id: 'reports' }
  ],
  super_admin: [
    { section: 'Overview' },
    { label: 'Dashboard', icon: 'dashboard', href: 'admin-dashboard.html', id: 'admin-dashboard' },
    { label: 'Managers', icon: 'admin_panel_settings', href: 'manager-management.html', id: 'manager-management' },
    { label: 'Employees', icon: 'groups', href: 'employee-management.html', id: 'employee-management' },
    { section: 'System' },
    { label: 'Calendar', icon: 'calendar_month', href: 'calendar.html', id: 'calendar' },
    { label: 'Reports', icon: 'monitoring', href: 'reports.html', id: 'reports' }
  ]
};

const ROLE_LABELS = { super_admin: 'Super Admin', manager: 'Manager', employee: 'Employee' };

/* ---------------------------- LAYOUT RENDERING ---------------------------- */
function initials(name) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function buildSidebar(user, activePage) {
  const items = NAV_CONFIG[user.role] || [];
  const collapsed = localStorage.getItem('fwms_sidebar_collapsed') === '1';
  let html = `
    <div class="sidebar-brand">
      <div class="brand-mark">FW</div>
      <div>
        <div class="brand-text">FieldPro</div>
        <div class="brand-sub">Field Work Suite</div>
      </div>
    </div>
    <nav class="sidebar-nav">`;
  items.forEach(item => {
    if (item.section) {
      html += `<div class="sidebar-section-label">${item.section}</div>`;
    } else {
      const active = item.id === activePage ? 'active' : '';
      html += `<a href="${item.href}" class="sidebar-link ${active}">
        <span class="material-symbols-outlined">${item.icon}</span>
        <span class="link-label">${item.label}</span>
      </a>`;
    }
  });
  html += `</nav>
    <div class="sidebar-footer">
      <a href="#" class="sidebar-user text-decoration-none" id="sidebarLogoutTrigger">
        <div class="user-avatar" style="background:${user.avatarColor || '#3457D5'}">${initials(user.name)}</div>
        <div class="user-meta">
          <div class="user-name">${user.name}</div>
          <div class="user-role">${ROLE_LABELS[user.role] || user.role}</div>
        </div>
      </a>
    </div>`;

  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = html;
  if (collapsed && window.innerWidth > 991) {
    sidebar.classList.add('collapsed');
    document.querySelector('.main-content').classList.add('sidebar-collapsed');
  }
}

function pageTitleFor(activePage) {
  const map = {
    'employee-dashboard': 'Dashboard', 'manager-dashboard': 'Dashboard', 'admin-dashboard': 'Dashboard',
    'daily-planner': 'Daily Planner', 'tasks': 'Task Management', 'work-log': 'Work Logs',
    'calendar': 'Calendar', 'reminders': 'Reminders', 'reports': 'Reports & Analytics',
    'employee-management': 'Employee Management', 'manager-management': 'Manager Management',
    'employee-profile': 'Employee Profile'
  };
  return map[activePage] || 'FieldPro';
}

function buildTopbar(user, activePage) {
  const topbar = document.getElementById('topbar');
  topbar.innerHTML = `
    <div class="d-flex align-items-center gap-2">
      <button class="icon-btn d-lg-none" id="mobileSidebarToggle" aria-label="Open menu">
        <span class="material-symbols-outlined">menu</span>
      </button>
      <button class="icon-btn d-none d-lg-flex" id="desktopSidebarToggle" aria-label="Collapse sidebar">
        <span class="material-symbols-outlined">menu_open</span>
      </button>
      <div>
        <h1 class="h5 mb-0 fw-display">${pageTitleFor(activePage)}</h1>
      </div>
    </div>
    <div class="search-box d-none d-md-block">
      <span class="material-symbols-outlined">search</span>
      <input type="search" class="form-control" placeholder="Search tasks, clients, logs..." id="globalSearchInput">
    </div>
    <div class="d-flex align-items-center gap-1">
      <button class="icon-btn" id="themeToggleBtn" aria-label="Toggle dark mode">
        <span class="material-symbols-outlined" id="themeToggleIcon">dark_mode</span>
      </button>
      <div class="dropdown">
        <button class="icon-btn" id="notifDropdownBtn" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Notifications">
          <span class="material-symbols-outlined">notifications</span>
          <span class="badge-dot" id="notifBadge" style="display:none;"></span>
        </button>
        <div class="dropdown-menu dropdown-menu-end p-0" style="width: 340px;" id="notifDropdownMenu">
          <div class="p-3 border-bottom"><strong>Notifications</strong></div>
          <div class="scroll-y-thin p-2" id="notifList">
            <div class="text-center text-muted-fw py-3 small">Loading...</div>
          </div>
        </div>
      </div>
      <div class="dropdown ms-1">
        <button class="btn d-flex align-items-center gap-2 border-0 bg-transparent p-1" data-bs-toggle="dropdown" aria-expanded="false">
          <div class="user-avatar avatar-sm" style="background:${user.avatarColor || '#3457D5'}">${initials(user.name)}</div>
          <span class="d-none d-md-inline material-symbols-outlined text-muted-fw" style="font-size:18px;">expand_more</span>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><h6 class="dropdown-header">${user.name}<br><small class="text-muted-fw">${user.email}</small></h6></li>
          <li><hr class="dropdown-divider"></li>
          ${user.role === 'employee' ? '<li><a class="dropdown-item" href="employee-profile.html?id=self"><span class="material-symbols-outlined align-middle me-2" style="font-size:18px;">person</span>My Profile</a></li>' : ''}
          <li><a class="dropdown-item" href="#" id="topbarLogoutTrigger"><span class="material-symbols-outlined align-middle me-2" style="font-size:18px;">logout</span>Log Out</a></li>
        </ul>
      </div>
    </div>`;
}

function wireLayoutEvents() {
  const sidebar = document.getElementById('sidebar');
  const main = document.querySelector('.main-content');

  document.getElementById('desktopSidebarToggle')?.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('sidebar-collapsed');
    localStorage.setItem('fwms_sidebar_collapsed', sidebar.classList.contains('collapsed') ? '1' : '0');
  });

  let backdrop = document.querySelector('.sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    document.body.appendChild(backdrop);
  }
  const closeMobileSidebar = () => { sidebar.classList.remove('show'); backdrop.classList.remove('show'); };
  document.getElementById('mobileSidebarToggle')?.addEventListener('click', () => {
    sidebar.classList.add('show'); backdrop.classList.add('show');
  });
  backdrop.addEventListener('click', closeMobileSidebar);
  sidebar.querySelectorAll('.sidebar-link').forEach(a => a.addEventListener('click', closeMobileSidebar));

  document.getElementById('themeToggleBtn')?.addEventListener('click', toggleTheme);
  document.getElementById('sidebarLogoutTrigger')?.addEventListener('click', (e) => { e.preventDefault(); confirmLogout(); });
  document.getElementById('topbarLogoutTrigger')?.addEventListener('click', (e) => { e.preventDefault(); confirmLogout(); });

  document.getElementById('globalSearchInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      window.location.href = `tasks.html?q=${encodeURIComponent(e.target.value.trim())}`;
    }
  });
}

function confirmLogout() {
  showConfirm({
    title: 'Log out?',
    message: 'You will need to sign in again to access your dashboard.',
    confirmText: 'Log Out', confirmClass: 'btn-danger'
  }).then(ok => { if (ok) Auth.logout(); });
}

/* ---------------------------- THEME ---------------------------- */
function applyStoredTheme() {
  const theme = localStorage.getItem('fwms_theme') || 'light';
  document.documentElement.setAttribute('data-bs-theme', theme);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-bs-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-bs-theme', next);
  localStorage.setItem('fwms_theme', next);
  const icon = document.getElementById('themeToggleIcon');
  if (icon) icon.textContent = next === 'dark' ? 'light_mode' : 'dark_mode';
}
applyStoredTheme();

/* ---------------------------- NOTIFICATIONS DROPDOWN ---------------------------- */
async function populateNotifDropdown(user) {
  const list = document.getElementById('notifList');
  const badge = document.getElementById('notifBadge');
  if (!list) return;
  const reminders = user.role === 'employee' ? await API.reminders.getForUser(user.id) : await API.reminders.getAll();
  const unseen = reminders.filter(r => !r.seen).sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
  if (unseen.length === 0) {
    list.innerHTML = `<div class="text-center text-muted-fw py-4 small">
      <span class="material-symbols-outlined d-block mb-1" style="font-size:28px;">notifications_off</span>
      You're all caught up.
    </div>`;
    badge.style.display = 'none';
    return;
  }
  badge.style.display = 'block';
  list.innerHTML = unseen.slice(0, 6).map(r => `
    <div class="d-flex gap-2 p-2 rounded-3 accent-bar a-reminder mb-1">
      <span class="material-symbols-outlined text-muted-fw" style="font-size:20px;">notifications</span>
      <div class="flex-grow-1">
        <div class="small fw-semibold">${escapeHtml(r.title)}</div>
        <div class="small text-muted-fw">${escapeHtml(r.message)}</div>
        <div class="small text-muted-fw">${formatDateTime(r.datetime)}</div>
      </div>
    </div>`).join('') +
    `<div class="text-center p-2"><a href="reminders.html" class="small">View all reminders</a></div>`;
}

/* ---------------------------- MASTER INIT ---------------------------- */
/**
 * Call this at the top of every protected page.
 * @param {string} activePage - id matching NAV_CONFIG entry, used to highlight sidebar link
 * @param {string} allowedRoles - comma separated roles permitted on this page
 * @returns {object} the current user session
 */
function initPage(activePage, allowedRoles) {
  const user = Auth.requireAuth(allowedRoles);
  if (!user) return null; // redirect already triggered
  buildSidebar(user, activePage);
  buildTopbar(user, activePage);
  wireLayoutEvents();
  populateNotifDropdown(user);
  requestNotificationPermissionOnce();
  return user;
}

/* ---------------------------- TOASTS ---------------------------- */
function ensureToastContainer() {
  let el = document.getElementById('toastContainer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toastContainer';
    el.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    el.style.zIndex = 1080;
    document.body.appendChild(el);
  }
  return el;
}

/**
 * Show a Bootstrap toast.
 * @param {string} message
 * @param {'success'|'danger'|'warning'|'info'} type
 */
function showToast(message, type = 'success') {
  const icons = { success: 'check_circle', danger: 'error', warning: 'warning', info: 'info' };
  const colors = { success: 'text-bg-success', danger: 'text-bg-danger', warning: 'text-bg-warning', info: 'text-bg-primary' };
  const container = ensureToastContainer();
  const id = 'toast_' + Date.now();
  const div = document.createElement('div');
  div.className = `toast align-items-center border-0 ${colors[type]}`;
  div.id = id;
  div.setAttribute('role', 'alert');
  div.innerHTML = `
    <div class="d-flex">
      <div class="toast-body d-flex align-items-center gap-2">
        <span class="material-symbols-outlined" style="font-size:20px;">${icons[type]}</span>
        ${escapeHtml(message)}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>`;
  container.appendChild(div);
  const toast = new bootstrap.Toast(div, { delay: 3800 });
  toast.show();
  div.addEventListener('hidden.bs.toast', () => div.remove());
}

/* ---------------------------- CONFIRM MODAL ---------------------------- */
function ensureConfirmModal() {
  let el = document.getElementById('sharedConfirmModal');
  if (!el) {
    el = document.createElement('div');
    el.innerHTML = `
      <div class="modal fade" id="sharedConfirmModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-body p-4">
              <h5 class="fw-display mb-2" id="confirmModalTitle">Are you sure?</h5>
              <p class="text-muted-fw mb-4" id="confirmModalMessage"></p>
              <div class="d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-light" data-bs-dismiss="modal" id="confirmModalCancel">Cancel</button>
                <button type="button" class="btn btn-primary" id="confirmModalOk">Confirm</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(el.firstElementChild);
  }
  return document.getElementById('sharedConfirmModal');
}

/**
 * Show a confirm dialog. Resolves true/false.
 */
function showConfirm({ title = 'Are you sure?', message = '', confirmText = 'Confirm', confirmClass = 'btn-primary' } = {}) {
  const modalEl = ensureConfirmModal();
  document.getElementById('confirmModalTitle').textContent = title;
  document.getElementById('confirmModalMessage').textContent = message;
  const okBtn = document.getElementById('confirmModalOk');
  okBtn.className = `btn ${confirmClass}`;
  okBtn.textContent = confirmText;
  const modal = new bootstrap.Modal(modalEl);
  return new Promise((resolve) => {
    const onOk = () => { modal.hide(); cleanup(); resolve(true); };
    const onHide = () => { cleanup(); resolve(false); };
    function cleanup() {
      okBtn.removeEventListener('click', onOk);
      modalEl.removeEventListener('hidden.bs.modal', onHide);
    }
    okBtn.addEventListener('click', onOk);
    modalEl.addEventListener('hidden.bs.modal', onHide);
    modal.show();
  });
}

/* ---------------------------- BROWSER NOTIFICATIONS ---------------------------- */
function requestNotificationPermissionOnce() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default' && !sessionStorage.getItem('fwms_notif_asked')) {
    sessionStorage.setItem('fwms_notif_asked', '1');
    setTimeout(() => Notification.requestPermission(), 1500);
  }
}
function pushBrowserNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '' });
  }
}

/* ---------------------------- FORMAT HELPERS ---------------------------- */
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function todayISO() { return new Date().toISOString().split('T')[0]; }

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function formatDateLong(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}
function formatDateTime(isoDateTime) {
  if (!isoDateTime) return '—';
  const d = new Date(isoDateTime);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function isOverdue(dueDate, status) {
  if (status === 'Completed' || status === 'Cancelled') return false;
  return dueDate < todayISO();
}

function statusPill(status) {
  const map = {
    'Pending': 'pill-amber', 'In Progress': 'pill-blue', 'Completed': 'pill-teal', 'Cancelled': 'pill-gray',
    'Overdue': 'pill-red', 'active': 'pill-teal', 'disabled': 'pill-red'
  };
  const label = status === 'active' ? 'Active' : status === 'disabled' ? 'Disabled' : status;
  return `<span class="pill ${map[status] || 'pill-gray'}">${label}</span>`;
}
function priorityBadge(priority) {
  return `<span class="d-inline-flex align-items-center"><span class="priority-dot priority-${priority}"></span>${priority}</span>`;
}

function debounce(fn, delay = 300) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function getInitials(name) { return initials(name); }
