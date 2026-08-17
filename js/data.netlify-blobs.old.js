/**
 * ============================================================================
 * FWMS DATA LAYER  (js/data.js)
 * ----------------------------------------------------------------------------
 * This file talks to the real backend: a set of Netlify Functions in
 * netlify/functions/, backed by Postgres (Netlify DB, powered by Neon).
 *
 * Every read/write in the app goes through the `API` object below, and every
 * method still returns a Promise with exactly the same shape it always did —
 * so no other page or controller file needed to change for this swap.
 * (This file previously kept a mock database in localStorage; see
 * js/data.old.js if you ever want to see that version again.)
 * ============================================================================
 */

const SESSION_KEY = 'fwms_session'; // used by js/auth.js — keep this defined here
const FUNCTIONS_BASE = '/.netlify/functions';

/** Shared fetch wrapper: JSON in, JSON out, throws a readable Error on failure. */
async function apiRequest(path, options = {}) {
  const res = await fetch(FUNCTIONS_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    let message = 'Request failed (' + res.status + ')';
    try {
      const errBody = await res.json();
      if (errBody && errBody.error) message = errBody.error;
    } catch (e) { /* response wasn't JSON — keep the generic message */ }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

const qs = (params) => {
  const usp = new URLSearchParams();
  Object.keys(params).forEach((k) => {
    if (params[k] !== undefined && params[k] !== null && params[k] !== '') usp.set(k, params[k]);
  });
  const s = usp.toString();
  return s ? '?' + s : '';
};

/* ---------------------------------------------------------------------------
 * PUBLIC API — this is the ONLY surface the rest of the app talks to.
 * ------------------------------------------------------------------------- */
const API = {

  /* ---------------- USERS ---------------- */
  users: {
    getAll: () => apiRequest('/users'),
    getById: (id) => apiRequest('/users' + qs({ id })),
    getByEmail: (email) => apiRequest('/users' + qs({ email })),
    getEmployeesForManager: (managerId) => apiRequest('/users' + qs({ managerId })),
    getAllEmployees: () => apiRequest('/users' + qs({ role: 'employee' })),
    getAllManagers: () => apiRequest('/users' + qs({ role: 'manager' })),
    create: (user) => apiRequest('/users', { method: 'POST', body: JSON.stringify(user) }),
    update: (id, changes) => apiRequest('/users' + qs({ id }), { method: 'PATCH', body: JSON.stringify(changes) }),
    setStatus: (id, status) => API.users.update(id, { status }),
    resetPassword: (id, newPassword) => API.users.update(id, { password: newPassword })
  },

  /* ---------------- TASKS ---------------- */
  tasks: {
    getAll: () => apiRequest('/tasks'),
    getById: (id) => apiRequest('/tasks' + qs({ id })),
    getForUser: (userId) => apiRequest('/tasks' + qs({ assignedTo: userId })),
    getForUsers: (userIds) => apiRequest('/tasks' + qs({ assignedToIn: userIds.join(',') })),
    create: (task) => apiRequest('/tasks', { method: 'POST', body: JSON.stringify(task) }),
    update: (id, changes) => apiRequest('/tasks' + qs({ id }), { method: 'PATCH', body: JSON.stringify(changes) }),
    remove: (id) => apiRequest('/tasks' + qs({ id }), { method: 'DELETE' })
  },

  /* ---------------- WORK LOGS ---------------- */
  workLogs: {
    getAll: () => apiRequest('/worklogs'),
    getForUser: (userId) => apiRequest('/worklogs' + qs({ employeeId: userId })),
    getForUsers: (userIds) => apiRequest('/worklogs' + qs({ employeeIdIn: userIds.join(',') })),
    create: (log) => apiRequest('/worklogs', { method: 'POST', body: JSON.stringify(log) }),
    update: (id, changes) => apiRequest('/worklogs' + qs({ id }), { method: 'PATCH', body: JSON.stringify(changes) }),
    remove: (id) => apiRequest('/worklogs' + qs({ id }), { method: 'DELETE' })
  },

  /* ---------------- REMINDERS ---------------- */
  reminders: {
    getAll: () => apiRequest('/reminders'),
    getForUser: (userId) => apiRequest('/reminders' + qs({ forUser: userId })),
    create: (reminder) => apiRequest('/reminders', { method: 'POST', body: JSON.stringify(reminder) }),
    update: (id, changes) => apiRequest('/reminders' + qs({ id }), { method: 'PATCH', body: JSON.stringify(changes) }),
    remove: (id) => apiRequest('/reminders' + qs({ id }), { method: 'DELETE' })
  },

  /* ---------------- DAILY PLANNER ---------------- */
  planner: {
    getForUserAndDate: (userId, date) => apiRequest('/planner' + qs({ employeeId: userId, date })),
    create: (item) => apiRequest('/planner', { method: 'POST', body: JSON.stringify(item) }),
    update: (id, changes) => apiRequest('/planner' + qs({ id }), { method: 'PATCH', body: JSON.stringify(changes) }),
    reorder: (orderedIds) => apiRequest('/planner' + qs({ action: 'reorder' }), {
      method: 'PATCH', body: JSON.stringify({ orderedIds })
    }),
    remove: (id) => apiRequest('/planner' + qs({ id }), { method: 'DELETE' })
  },

  /* ---------------- ACTIVITY FEED ---------------- */
  activity: {
    getRecent: (limit = 10) => apiRequest('/activity' + qs({ limit })),
    log: (userId, message) => apiRequest('/activity', { method: 'POST', body: JSON.stringify({ userId, message }) })
  },

  /* ---------------- ADMIN / DEV UTILITY ---------------- */
  system: {
    resetDemoData: () => apiRequest('/reset-demo-data', { method: 'POST' })
  }
};
