/**
 * ============================================================================
 * FWMS DATA LAYER  (js/data.js)
 * ----------------------------------------------------------------------------
 * No backend code at all. This file calls Supabase's auto-generated REST API
 * (PostgREST) directly from the browser using fetch() — the whole app is
 * static HTML/CSS/JS and can be hosted anywhere that serves plain files,
 * including GitHub Pages.
 *
 * SETUP (one-time, see README.md for the full walkthrough):
 *   1. Create a free project at supabase.com
 *   2. Paste supabase/schema.sql into the Supabase SQL Editor and run it once
 *   3. Fill in SUPABASE_URL and SUPABASE_ANON_KEY below, from
 *      Project Settings > API in your Supabase dashboard
 *
 * Every page still only ever talks to the `API` object below, and every
 * method still returns a Promise with exactly the same shape it always
 * did — so no other page or controller file needed to change for this swap.
 * ============================================================================
 */

const SESSION_KEY = 'fwms_session'; // used by js/auth.js — keep this defined here

// ---- FILL THESE IN after creating your Supabase project ----
// Project Settings > API in the Supabase dashboard.
const SUPABASE_URL = 'https://pgzrtxnbupfrtnigusis.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_TLSQCoNjii0RlxDk8os2dA_RUN18ie_';
// --------------------------------------------------------------

/** Low-level PostgREST request helper. `query` is an array of "col=op.val" strings. */
async function sb(table, { method = 'GET', query = [], body, single = false } = {}) {
  if (SUPABASE_URL.includes('YOUR-PROJECT-REF') || SUPABASE_ANON_KEY.includes('YOUR-ANON')) {
    throw new Error('Supabase is not configured yet — fill in SUPABASE_URL and SUPABASE_ANON_KEY at the top of js/data.js');
  }
  const qs = query.length ? '?' + query.join('&') : '';
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: 'Bearer ' + SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  };
  if (body !== undefined) headers.Prefer = 'return=representation';

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    let message = 'Request failed (' + res.status + ')';
    try {
      const errBody = await res.json();
      if (errBody && (errBody.message || errBody.hint)) message = errBody.message || errBody.hint;
    } catch (e) { /* not JSON — keep generic message */ }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (single) return Array.isArray(data) ? (data[0] || null) : data;
  return data;
}

const enc = (v) => encodeURIComponent(v);

/* ---------------------------------------------------------------------------
 * DEMO SEED DATA — same dataset the app has always shipped with, used only
 * by API.system.resetDemoData() below (initial data comes from schema.sql).
 * ------------------------------------------------------------------------- */
function dstr(offsetDays) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
function dtstr(offsetDays, hh, mm) {
  return `${dstr(offsetDays)}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00.000Z`;
}
function buildSeedData() {
  const today = dstr(0), yesterday = dstr(-1), tomorrow = dstr(1);
  return {
    users: [
      { id: 'u1', role: 'super_admin', name: 'Alex Morgan', email: 'admin@fwms.com', password: 'password123', phone: '+94 71 234 5678', avatarColor: '#3457D5', status: 'active', managerId: null, title: 'Super Administrator', joinDate: '2022-01-10' },
      { id: 'u2', role: 'manager', name: 'Priya Sharma', email: 'priya.manager@fwms.com', password: 'password123', phone: '+94 71 987 6543', avatarColor: '#14B8A6', status: 'active', managerId: null, title: 'Field Operations Manager', joinDate: '2022-03-14' },
      { id: 'u3', role: 'manager', name: 'David Chen', email: 'david.manager@fwms.com', password: 'password123', phone: '+94 76 555 1122', avatarColor: '#F59E0B', status: 'active', managerId: null, title: 'Regional Manager - South', joinDate: '2022-05-02' },
      { id: 'u4', role: 'employee', name: 'Ravi Kumar', email: 'ravi.employee@fwms.com', password: 'password123', phone: '+94 77 111 2233', avatarColor: '#3457D5', status: 'active', managerId: 'u2', title: 'Field Service Engineer', joinDate: '2023-02-20' },
      { id: 'u5', role: 'employee', name: 'Sarah Lee', email: 'sarah.employee@fwms.com', password: 'password123', phone: '+94 77 444 5566', avatarColor: '#EF4444', status: 'active', managerId: 'u2', title: 'Field Technician', joinDate: '2023-06-11' },
      { id: 'u6', role: 'employee', name: 'Mohammed Ali', email: 'mohammed.employee@fwms.com', password: 'password123', phone: '+94 70 222 9988', avatarColor: '#8B5CF6', status: 'active', managerId: 'u3', title: 'Installation Specialist', joinDate: '2023-08-01' },
      { id: 'u7', role: 'employee', name: 'Nadia Fernando', email: 'nadia.employee@fwms.com', password: 'password123', phone: '+94 77 888 3344', avatarColor: '#0EA5E9', status: 'disabled', managerId: 'u3', title: 'Field Technician', joinDate: '2022-11-19' }
    ],
    tasks: [
      { id: 't1', title: 'Site inspection - Colombo Tower', description: 'Perform routine inspection of HVAC units on floors 4-6.', priority: 'High', dueDate: today, status: 'In Progress', reminder: true, createdBy: 'u2', assignedTo: 'u4', createdDate: yesterday },
      { id: 't2', title: 'Submit weekly expense report', description: 'Compile fuel and material receipts for the week.', priority: 'Medium', dueDate: today, status: 'Pending', reminder: true, createdBy: 'u4', assignedTo: 'u4', createdDate: yesterday },
      { id: 't3', title: 'Client follow-up call - Nimal Traders', description: 'Confirm satisfaction after generator repair.', priority: 'Low', dueDate: tomorrow, status: 'Pending', reminder: false, createdBy: 'u4', assignedTo: 'u4', createdDate: today },
      { id: 't4', title: 'Replace faulty circuit breaker', description: 'Panel B, warehouse 2. Part already ordered.', priority: 'High', dueDate: yesterday, status: 'Pending', reminder: true, createdBy: 'u2', assignedTo: 'u4', createdDate: dstr(-3) },
      { id: 't5', title: 'Vehicle maintenance checkup', description: 'Service van FWD-2214 at authorized garage.', priority: 'Medium', dueDate: dstr(2), status: 'Pending', reminder: true, createdBy: 'u4', assignedTo: 'u4', createdDate: today },
      { id: 't6', title: 'Quarterly safety training', description: 'Attend mandatory safety refresher at HQ.', priority: 'Medium', dueDate: dstr(5), status: 'Pending', reminder: true, createdBy: 'u2', assignedTo: 'u4', createdDate: yesterday },
      { id: 't7', title: 'Install new router - Beira Residency', description: 'Setup and configure network hardware.', priority: 'High', dueDate: dstr(-2), status: 'Completed', reminder: false, createdBy: 'u2', assignedTo: 'u4', createdDate: dstr(-6) },
      { id: 't8', title: 'Update client contact database', description: 'Sync new numbers collected in the field.', priority: 'Low', dueDate: dstr(-4), status: 'Completed', reminder: false, createdBy: 'u4', assignedTo: 'u4', createdDate: dstr(-8) },
      { id: 't9', title: 'Solar panel cleaning - Galle Rd site', description: 'Bi-weekly cleaning and output check.', priority: 'Medium', dueDate: today, status: 'In Progress', reminder: true, createdBy: 'u2', assignedTo: 'u5', createdDate: yesterday },
      { id: 't10', title: 'Replace water pump seal', description: 'Client reported leakage near intake valve.', priority: 'High', dueDate: yesterday, status: 'Pending', reminder: true, createdBy: 'u2', assignedTo: 'u5', createdDate: dstr(-2) },
      { id: 't11', title: 'Prepare monthly site report', description: 'Summarize all visits for Kandy region.', priority: 'Medium', dueDate: dstr(3), status: 'Pending', reminder: false, createdBy: 'u5', assignedTo: 'u5', createdDate: today },
      { id: 't12', title: 'Fiber splicing - Matara exchange', description: 'New line splicing for enterprise client.', priority: 'High', dueDate: today, status: 'Pending', reminder: true, createdBy: 'u3', assignedTo: 'u6', createdDate: yesterday },
      { id: 't13', title: 'CCTV camera realignment', description: 'Adjust angles after building renovation.', priority: 'Low', dueDate: tomorrow, status: 'Pending', reminder: false, createdBy: 'u6', assignedTo: 'u6', createdDate: today }
    ],
    workLogs: [
      { id: 'w1', employeeId: 'u4', date: today, startTime: '08:30', endTime: '10:15', clientName: 'Colombo Tower Mgmt', location: 'Colombo 03', description: 'Inspected HVAC units on floor 4 and 5.', issueIdentified: 'Unit 5B compressor noise.', actionTaken: 'Lubricated bearings, monitored for 20 min.', timeSpent: '1h 45m', status: 'Completed', remarks: 'Recommend replacement within 3 months.', attachment: 'inspection_photo_01.jpg' },
      { id: 'w2', employeeId: 'u4', date: today, startTime: '11:00', endTime: '12:30', clientName: 'Nimal Traders', location: 'Wellawatte', description: 'Generator repair follow-up visit.', issueIdentified: 'Fuel line minor leak.', actionTaken: 'Replaced gasket and tested under load.', timeSpent: '1h 30m', status: 'Completed', remarks: 'Client satisfied, no further issues.', attachment: '' },
      { id: 'w3', employeeId: 'u4', date: yesterday, startTime: '09:00', endTime: '11:00', clientName: 'Beira Residency', location: 'Colombo 02', description: 'Router installation and network configuration.', issueIdentified: 'ISP signal instability.', actionTaken: 'Configured backup failover and tested speeds.', timeSpent: '2h 00m', status: 'Completed', remarks: 'Follow-up scheduled next month.', attachment: 'network_config.pdf' },
      { id: 'w4', employeeId: 'u4', date: yesterday, startTime: '13:30', endTime: '15:00', clientName: 'Warehouse 2 - ACME Logistics', location: 'Peliyagoda', description: 'Diagnosed circuit breaker fault on Panel B.', issueIdentified: 'Breaker tripping under load.', actionTaken: 'Isolated circuit pending replacement part.', timeSpent: '1h 30m', status: 'In Progress', remarks: 'Part ordered, revisit required.', attachment: '' },
      { id: 'w5', employeeId: 'u5', date: today, startTime: '08:00', endTime: '09:45', clientName: 'Galle Rd Solar Farm', location: 'Galle Road', description: 'Bi-weekly solar panel cleaning, row A-C.', issueIdentified: 'Dust accumulation reducing output ~8%.', actionTaken: 'Cleaned panels, logged new output readings.', timeSpent: '1h 45m', status: 'In Progress', remarks: 'Rows D-F scheduled for tomorrow.', attachment: 'output_readings.csv' },
      { id: 'w6', employeeId: 'u5', date: yesterday, startTime: '10:00', endTime: '11:30', clientName: 'Hillcrest Apartments', location: 'Kandy', description: 'Water pump seal inspection.', issueIdentified: 'Leakage at intake valve confirmed.', actionTaken: 'Temporary seal applied, part requested.', timeSpent: '1h 30m', status: 'Pending', remarks: 'Return visit required with new seal.', attachment: '' },
      { id: 'w7', employeeId: 'u6', date: today, startTime: '09:00', endTime: '13:00', clientName: 'Matara Exchange', location: 'Matara', description: 'Fiber splicing for new enterprise connection.', issueIdentified: 'Existing duct partially blocked.', actionTaken: 'Cleared duct, completed 12 splices.', timeSpent: '4h 00m', status: 'Completed', remarks: 'Line tested at full capacity.', attachment: 'splice_test_results.pdf' },
      { id: 'w8', employeeId: 'u6', date: yesterday, startTime: '14:00', endTime: '15:20', clientName: 'Southgate Mall', location: 'Matara', description: 'CCTV camera realignment after renovation.', issueIdentified: 'Two cameras with obstructed view.', actionTaken: 'Repositioned and re-tested feeds.', timeSpent: '1h 20m', status: 'Completed', remarks: '', attachment: '' }
    ],
    reminders: [
      { id: 'r1', title: 'Call client before site visit', message: 'Confirm arrival time with Colombo Tower facilities team.', datetime: dtstr(0, 8, 0), createdBy: 'u4', forUser: 'u4', seen: false },
      { id: 'r2', title: 'Submit expense report', message: 'Deadline is end of day today.', datetime: dtstr(0, 16, 0), createdBy: 'u4', forUser: 'u4', seen: false },
      { id: 'r3', title: 'Vehicle service reminder', message: 'Van FWD-2214 due for maintenance in 2 days.', datetime: dtstr(1, 9, 0), createdBy: 'u4', forUser: 'u4', seen: false },
      { id: 'r4', title: 'Team meeting - weekly sync', message: 'Join the 9:30 AM call with the operations team.', datetime: dtstr(0, 9, 30), createdBy: 'u2', forUser: 'u4', seen: true },
      { id: 'r5', title: 'Safety training enrollment closes', message: 'Confirm your seat for the quarterly refresher.', datetime: dtstr(4, 12, 0), createdBy: 'u2', forUser: 'u4', seen: false },
      { id: 'r6', title: 'Review pending tasks', message: 'Two tasks are overdue and need attention.', datetime: dtstr(0, 7, 30), createdBy: 'u2', forUser: 'u2', seen: false }
    ],
    plannerItems: [
      { id: 'p1', employeeId: 'u4', date: today, title: 'Inspect HVAC units - Colombo Tower', order: 1, completed: true, taskId: 't1', carriedFrom: null },
      { id: 'p2', employeeId: 'u4', date: today, title: 'Follow-up call - Nimal Traders', order: 2, completed: true, taskId: null, carriedFrom: null },
      { id: 'p3', employeeId: 'u4', date: today, title: 'Submit weekly expense report', order: 3, completed: false, taskId: 't2', carriedFrom: null },
      { id: 'p4', employeeId: 'u4', date: today, title: 'Check spare parts inventory in van', order: 4, completed: false, taskId: null, carriedFrom: null },
      { id: 'p5', employeeId: 'u4', date: today, title: 'Replace circuit breaker - Warehouse 2', order: 5, completed: false, taskId: 't4', carriedFrom: yesterday },
      { id: 'p6', employeeId: 'u4', date: yesterday, title: 'Replace circuit breaker - Warehouse 2', order: 1, completed: false, taskId: 't4', carriedFrom: null },
      { id: 'p7', employeeId: 'u4', date: yesterday, title: 'Router installation - Beira Residency', order: 2, completed: true, taskId: null, carriedFrom: null },
      { id: 'p8', employeeId: 'u4', date: tomorrow, title: 'Client follow-up call - Nimal Traders', order: 1, completed: false, taskId: 't3', carriedFrom: null }
    ],
    activityFeed: [
      { id: 'a1', userId: 'u4', message: 'completed task "Install new router - Beira Residency"', time: dtstr(-2, 15, 10) },
      { id: 'a2', userId: 'u5', message: 'logged 1h 45m of work at Galle Rd Solar Farm', time: dtstr(0, 9, 45) },
      { id: 'a3', userId: 'u6', message: 'completed task "Fiber splicing - Matara exchange"', time: dtstr(0, 13, 5) },
      { id: 'a4', userId: 'u4', message: 'added a new work log for Nimal Traders', time: dtstr(0, 12, 35) },
      { id: 'a5', userId: 'u7', message: 'account disabled by manager', time: dtstr(-5, 11, 0) },
      { id: 'a6', userId: 'u5', message: 'marked task "Replace water pump seal" as overdue', time: dtstr(-1, 17, 0) }
    ]
  };
}

/* ---------------------------------------------------------------------------
 * PUBLIC API — this is the ONLY surface the rest of the app talks to.
 * ------------------------------------------------------------------------- */
const API = {

  /* ---------------- USERS ---------------- */
  users: {
    getAll: () => sb('users', { query: ['select=*', 'order=joinDate.asc'] }),
    getById: (id) => sb('users', { query: [`id=eq.${enc(id)}`, 'select=*'], single: true }),
    getByEmail: (email) => sb('users', { query: [`email=eq.${enc(email)}`, 'select=*'], single: true }),
    getEmployeesForManager: (managerId) => sb('users', { query: [`managerId=eq.${enc(managerId)}`, 'role=eq.employee', 'select=*'] }),
    getAllEmployees: () => sb('users', { query: ['role=eq.employee', 'select=*'] }),
    getAllManagers: () => sb('users', { query: ['role=eq.manager', 'select=*'] }),
    create: (user) => sb('users', { method: 'POST', body: user, single: true }),
    update: (id, changes) => sb('users', { method: 'PATCH', query: [`id=eq.${enc(id)}`], body: changes, single: true }),
    setStatus: (id, status) => API.users.update(id, { status }),
    resetPassword: (id, newPassword) => API.users.update(id, { password: newPassword })
  },

  /* ---------------- TASKS ---------------- */
  tasks: {
    getAll: () => sb('tasks', { query: ['select=*', 'order=dueDate.asc'] }),
    getById: (id) => sb('tasks', { query: [`id=eq.${enc(id)}`, 'select=*'], single: true }),
    getForUser: (userId) => sb('tasks', { query: [`assignedTo=eq.${enc(userId)}`, 'select=*', 'order=dueDate.asc'] }),
    getForUsers: (userIds) => sb('tasks', { query: [`assignedTo=in.(${userIds.map(enc).join(',')})`, 'select=*', 'order=dueDate.asc'] }),
    create: (task) => sb('tasks', { method: 'POST', body: task, single: true }),
    update: (id, changes) => sb('tasks', { method: 'PATCH', query: [`id=eq.${enc(id)}`], body: changes, single: true }),
    remove: (id) => sb('tasks', { method: 'DELETE', query: [`id=eq.${enc(id)}`] })
  },

  /* ---------------- WORK LOGS ---------------- */
  workLogs: {
    getAll: () => sb('workLogs', { query: ['select=*', 'order=date.desc'] }),
    getForUser: (userId) => sb('workLogs', { query: [`employeeId=eq.${enc(userId)}`, 'select=*', 'order=date.desc'] }),
    getForUsers: (userIds) => sb('workLogs', { query: [`employeeId=in.(${userIds.map(enc).join(',')})`, 'select=*', 'order=date.desc'] }),
    create: (log) => sb('workLogs', { method: 'POST', body: log, single: true }),
    update: (id, changes) => sb('workLogs', { method: 'PATCH', query: [`id=eq.${enc(id)}`], body: changes, single: true }),
    remove: (id) => sb('workLogs', { method: 'DELETE', query: [`id=eq.${enc(id)}`] })
  },

  /* ---------------- REMINDERS ---------------- */
  reminders: {
    getAll: () => sb('reminders', { query: ['select=*', 'order=datetime.asc'] }),
    getForUser: (userId) => sb('reminders', { query: [`forUser=eq.${enc(userId)}`, 'select=*', 'order=datetime.asc'] }),
    create: (reminder) => sb('reminders', { method: 'POST', body: reminder, single: true }),
    update: (id, changes) => sb('reminders', { method: 'PATCH', query: [`id=eq.${enc(id)}`], body: changes, single: true }),
    remove: (id) => sb('reminders', { method: 'DELETE', query: [`id=eq.${enc(id)}`] })
  },

  /* ---------------- DAILY PLANNER ----------------
   * DB column is "sortOrder" (not "order" — that's a reserved PostgREST
   * keyword used for sorting results), mapped back to `order` here so the
   * rest of the app never has to know that.
   */
  planner: {
    getForUserAndDate: async (userId, date) => {
      const rows = await sb('plannerItems', {
        query: [`employeeId=eq.${enc(userId)}`, `date=eq.${enc(date)}`, 'select=*', 'order=sortOrder.asc']
      });
      return rows.map((r) => ({ ...r, order: r.sortOrder }));
    },
    create: async (item) => {
      const { order, ...rest } = item;
      const row = await sb('plannerItems', { method: 'POST', body: { ...rest, sortOrder: order }, single: true });
      return { ...row, order: row.sortOrder };
    },
    update: async (id, changes) => {
      const { order, ...rest } = changes;
      const body = order !== undefined ? { ...rest, sortOrder: order } : rest;
      const row = await sb('plannerItems', { method: 'PATCH', query: [`id=eq.${enc(id)}`], body, single: true });
      return { ...row, order: row.sortOrder };
    },
    reorder: (orderedIds) => Promise.all(
      orderedIds.map((id, i) => sb('plannerItems', { method: 'PATCH', query: [`id=eq.${enc(id)}`], body: { sortOrder: i + 1 } }))
    ),
    remove: (id) => sb('plannerItems', { method: 'DELETE', query: [`id=eq.${enc(id)}`] })
  },

  /* ---------------- ACTIVITY FEED ---------------- */
  activity: {
    getRecent: (limit = 10) => sb('activityFeed', { query: ['select=*', 'order=time.desc', `limit=${limit}`] }),
    log: (userId, message) => sb('activityFeed', {
      method: 'POST',
      body: { id: 'a_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), userId, message, time: new Date().toISOString() }
    })
  },

  /* ---------------- ADMIN / DEV UTILITY ---------------- */
  system: {
    resetDemoData: async () => {
      const seed = buildSeedData();
      const wipe = (table) => sb(table, { method: 'DELETE', query: ['id=not.is.null'] });
      const load = (table, rows) => sb(table, { method: 'POST', body: rows });
      await Promise.all(['users', 'tasks', 'workLogs', 'reminders', 'plannerItems', 'activityFeed'].map(wipe));
      await load('users', seed.users);
      await load('tasks', seed.tasks);
      await load('workLogs', seed.workLogs);
      await load('reminders', seed.reminders);
      await load('plannerItems', seed.plannerItems.map(({ order, ...rest }) => ({ ...rest, sortOrder: order })));
      await load('activityFeed', seed.activityFeed);
      return true;
    }
  }
};