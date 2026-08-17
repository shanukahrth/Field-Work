/**
 * ============================================================================
 * FWMS DATA LAYER  (js/data.js)
 * ----------------------------------------------------------------------------
 * This file simulates a backend + database using localStorage.
 *
 * IMPORTANT FOR FUTURE BACKEND INTEGRATION:
 * Every read/write in the app goes through the `API` object below. Each
 * method returns a Promise, exactly like a `fetch()` call would. To connect
 * a real backend (PHP/MySQL, Node/Express, etc.) later, you only need to
 * rewrite the body of the methods in `API` to call `fetch('/api/...')`
 * instead of touching `DB`. No other file in the app needs to change.
 * ============================================================================
 */

const STORAGE_KEY = 'fwms_db_v1';
const SESSION_KEY = 'fwms_session';
const NETWORK_DELAY = 120; // ms, simulated latency so UI loading states feel real

/* ---------------------------------------------------------------------------
 * SEED DATA
 * ------------------------------------------------------------------------- */
function seedDatabase() {
  const today = new Date();
  const iso = (d) => d.toISOString().split('T')[0];
  const addDays = (base, n) => { const d = new Date(base); d.setDate(d.getDate() + n); return d; };

  const todayStr = iso(today);
  const yesterdayStr = iso(addDays(today, -1));
  const tomorrowStr = iso(addDays(today, 1));

  const seed = {
    users: [
      { id: 'u1', role: 'super_admin', name: 'Alex Morgan', email: 'admin@fwms.com', password: 'password123',
        phone: '+94 71 234 5678', avatarColor: '#3457D5', status: 'active', managerId: null,
        title: 'Super Administrator', joinDate: '2022-01-10' },

      { id: 'u2', role: 'manager', name: 'Priya Sharma', email: 'priya.manager@fwms.com', password: 'password123',
        phone: '+94 71 987 6543', avatarColor: '#14B8A6', status: 'active', managerId: null,
        title: 'Field Operations Manager', joinDate: '2022-03-14' },

      { id: 'u3', role: 'manager', name: 'David Chen', email: 'david.manager@fwms.com', password: 'password123',
        phone: '+94 76 555 1122', avatarColor: '#F59E0B', status: 'active', managerId: null,
        title: 'Regional Manager - South', joinDate: '2022-05-02' },

      { id: 'u4', role: 'employee', name: 'Ravi Kumar', email: 'ravi.employee@fwms.com', password: 'password123',
        phone: '+94 77 111 2233', avatarColor: '#3457D5', status: 'active', managerId: 'u2',
        title: 'Field Service Engineer', joinDate: '2023-02-20' },

      { id: 'u5', role: 'employee', name: 'Sarah Lee', email: 'sarah.employee@fwms.com', password: 'password123',
        phone: '+94 77 444 5566', avatarColor: '#EF4444', status: 'active', managerId: 'u2',
        title: 'Field Technician', joinDate: '2023-06-11' },

      { id: 'u6', role: 'employee', name: 'Mohammed Ali', email: 'mohammed.employee@fwms.com', password: 'password123',
        phone: '+94 70 222 9988', avatarColor: '#8B5CF6', status: 'active', managerId: 'u3',
        title: 'Installation Specialist', joinDate: '2023-08-01' },

      { id: 'u7', role: 'employee', name: 'Nadia Fernando', email: 'nadia.employee@fwms.com', password: 'password123',
        phone: '+94 77 888 3344', avatarColor: '#0EA5E9', status: 'disabled', managerId: 'u3',
        title: 'Field Technician', joinDate: '2022-11-19' }
    ],

    tasks: [
      { id: 't1', title: 'Site inspection - Colombo Tower', description: 'Perform routine inspection of HVAC units on floors 4-6.',
        priority: 'High', dueDate: todayStr, status: 'In Progress', reminder: true, createdBy: 'u2', assignedTo: 'u4', createdDate: yesterdayStr },
      { id: 't2', title: 'Submit weekly expense report', description: 'Compile fuel and material receipts for the week.',
        priority: 'Medium', dueDate: todayStr, status: 'Pending', reminder: true, createdBy: 'u4', assignedTo: 'u4', createdDate: yesterdayStr },
      { id: 't3', title: 'Client follow-up call - Nimal Traders', description: 'Confirm satisfaction after generator repair.',
        priority: 'Low', dueDate: tomorrowStr, status: 'Pending', reminder: false, createdBy: 'u4', assignedTo: 'u4', createdDate: todayStr },
      { id: 't4', title: 'Replace faulty circuit breaker', description: 'Panel B, warehouse 2. Part already ordered.',
        priority: 'High', dueDate: yesterdayStr, status: 'Pending', reminder: true, createdBy: 'u2', assignedTo: 'u4', createdDate: iso(addDays(today, -3)) },
      { id: 't5', title: 'Vehicle maintenance checkup', description: 'Service van FWD-2214 at authorized garage.',
        priority: 'Medium', dueDate: iso(addDays(today, 2)), status: 'Pending', reminder: true, createdBy: 'u4', assignedTo: 'u4', createdDate: todayStr },
      { id: 't6', title: 'Quarterly safety training', description: 'Attend mandatory safety refresher at HQ.',
        priority: 'Medium', dueDate: iso(addDays(today, 5)), status: 'Pending', reminder: true, createdBy: 'u2', assignedTo: 'u4', createdDate: iso(addDays(today, -1)) },
      { id: 't7', title: 'Install new router - Beira Residency', description: 'Setup and configure network hardware.',
        priority: 'High', dueDate: iso(addDays(today, -2)), status: 'Completed', reminder: false, createdBy: 'u2', assignedTo: 'u4', createdDate: iso(addDays(today, -6)) },
      { id: 't8', title: 'Update client contact database', description: 'Sync new numbers collected in the field.',
        priority: 'Low', dueDate: iso(addDays(today, -4)), status: 'Completed', reminder: false, createdBy: 'u4', assignedTo: 'u4', createdDate: iso(addDays(today, -8)) },

      { id: 't9', title: 'Solar panel cleaning - Galle Rd site', description: 'Bi-weekly cleaning and output check.',
        priority: 'Medium', dueDate: todayStr, status: 'In Progress', reminder: true, createdBy: 'u2', assignedTo: 'u5', createdDate: yesterdayStr },
      { id: 't10', title: 'Replace water pump seal', description: 'Client reported leakage near intake valve.',
        priority: 'High', dueDate: yesterdayStr, status: 'Pending', reminder: true, createdBy: 'u2', assignedTo: 'u5', createdDate: iso(addDays(today, -2)) },
      { id: 't11', title: 'Prepare monthly site report', description: 'Summarize all visits for Kandy region.',
        priority: 'Medium', dueDate: iso(addDays(today, 3)), status: 'Pending', reminder: false, createdBy: 'u5', assignedTo: 'u5', createdDate: todayStr },

      { id: 't12', title: 'Fiber splicing - Matara exchange', description: 'New line splicing for enterprise client.',
        priority: 'High', dueDate: todayStr, status: 'Pending', reminder: true, createdBy: 'u3', assignedTo: 'u6', createdDate: yesterdayStr },
      { id: 't13', title: 'CCTV camera realignment', description: 'Adjust angles after building renovation.',
        priority: 'Low', dueDate: iso(addDays(today, 1)), status: 'Pending', reminder: false, createdBy: 'u6', assignedTo: 'u6', createdDate: todayStr }
    ],

    workLogs: [
      { id: 'w1', employeeId: 'u4', date: todayStr, startTime: '08:30', endTime: '10:15', clientName: 'Colombo Tower Mgmt',
        location: 'Colombo 03', description: 'Inspected HVAC units on floor 4 and 5.', issueIdentified: 'Unit 5B compressor noise.',
        actionTaken: 'Lubricated bearings, monitored for 20 min.', timeSpent: '1h 45m', status: 'Completed',
        remarks: 'Recommend replacement within 3 months.', attachment: 'inspection_photo_01.jpg' },
      { id: 'w2', employeeId: 'u4', date: todayStr, startTime: '11:00', endTime: '12:30', clientName: 'Nimal Traders',
        location: 'Wellawatte', location2: '', description: 'Generator repair follow-up visit.', issueIdentified: 'Fuel line minor leak.',
        actionTaken: 'Replaced gasket and tested under load.', timeSpent: '1h 30m', status: 'Completed',
        remarks: 'Client satisfied, no further issues.', attachment: '' },
      { id: 'w3', employeeId: 'u4', date: yesterdayStr, startTime: '09:00', endTime: '11:00', clientName: 'Beira Residency',
        location: 'Colombo 02', description: 'Router installation and network configuration.', issueIdentified: 'ISP signal instability.',
        actionTaken: 'Configured backup failover and tested speeds.', timeSpent: '2h 00m', status: 'Completed',
        remarks: 'Follow-up scheduled next month.', attachment: 'network_config.pdf' },
      { id: 'w4', employeeId: 'u4', date: yesterdayStr, startTime: '13:30', endTime: '15:00', clientName: 'Warehouse 2 - ACME Logistics',
        location: 'Peliyagoda', description: 'Diagnosed circuit breaker fault on Panel B.', issueIdentified: 'Breaker tripping under load.',
        actionTaken: 'Isolated circuit pending replacement part.', timeSpent: '1h 30m', status: 'In Progress',
        remarks: 'Part ordered, revisit required.', attachment: '' },

      { id: 'w5', employeeId: 'u5', date: todayStr, startTime: '08:00', endTime: '09:45', clientName: 'Galle Rd Solar Farm',
        location: 'Galle Road', description: 'Bi-weekly solar panel cleaning, row A-C.', issueIdentified: 'Dust accumulation reducing output ~8%.',
        actionTaken: 'Cleaned panels, logged new output readings.', timeSpent: '1h 45m', status: 'In Progress',
        remarks: 'Rows D-F scheduled for tomorrow.', attachment: 'output_readings.csv' },
      { id: 'w6', employeeId: 'u5', date: yesterdayStr, startTime: '10:00', endTime: '11:30', clientName: 'Hillcrest Apartments',
        location: 'Kandy', description: 'Water pump seal inspection.', issueIdentified: 'Leakage at intake valve confirmed.',
        actionTaken: 'Temporary seal applied, part requested.', timeSpent: '1h 30m', status: 'Pending',
        remarks: 'Return visit required with new seal.', attachment: '' },

      { id: 'w7', employeeId: 'u6', date: todayStr, startTime: '09:00', endTime: '13:00', clientName: 'Matara Exchange',
        location: 'Matara', description: 'Fiber splicing for new enterprise connection.', issueIdentified: 'Existing duct partially blocked.',
        actionTaken: 'Cleared duct, completed 12 splices.', timeSpent: '4h 00m', status: 'Completed',
        remarks: 'Line tested at full capacity.', attachment: 'splice_test_results.pdf' },
      { id: 'w8', employeeId: 'u6', date: yesterdayStr, startTime: '14:00', endTime: '15:20', clientName: 'Southgate Mall',
        location: 'Matara', description: 'CCTV camera realignment after renovation.', issueIdentified: 'Two cameras with obstructed view.',
        actionTaken: 'Repositioned and re-tested feeds.', timeSpent: '1h 20m', status: 'Completed',
        remarks: '', attachment: '' }
    ],

    reminders: [
      { id: 'r1', title: 'Call client before site visit', message: 'Confirm arrival time with Colombo Tower facilities team.',
        datetime: `${todayStr}T08:00`, createdBy: 'u4', forUser: 'u4', seen: false },
      { id: 'r2', title: 'Submit expense report', message: 'Deadline is end of day today.', datetime: `${todayStr}T16:00`,
        createdBy: 'u4', forUser: 'u4', seen: false },
      { id: 'r3', title: 'Vehicle service reminder', message: 'Van FWD-2214 due for maintenance in 2 days.',
        datetime: `${tomorrowStr}T09:00`, createdBy: 'u4', forUser: 'u4', seen: false },
      { id: 'r4', title: 'Team meeting - weekly sync', message: 'Join the 9:30 AM call with the operations team.',
        datetime: `${todayStr}T09:30`, createdBy: 'u2', forUser: 'u4', seen: true },
      { id: 'r5', title: 'Safety training enrollment closes', message: 'Confirm your seat for the quarterly refresher.',
        datetime: `${iso(addDays(today, 4))}T12:00`, createdBy: 'u2', forUser: 'u4', seen: false },
      { id: 'r6', title: 'Review pending tasks', message: 'Two tasks are overdue and need attention.',
        datetime: `${todayStr}T07:30`, createdBy: 'u2', forUser: 'u2', seen: false }
    ],

    plannerItems: [
      { id: 'p1', employeeId: 'u4', date: todayStr, title: 'Inspect HVAC units - Colombo Tower', order: 1, completed: true, taskId: 't1', carriedFrom: null },
      { id: 'p2', employeeId: 'u4', date: todayStr, title: 'Follow-up call - Nimal Traders', order: 2, completed: true, taskId: null, carriedFrom: null },
      { id: 'p3', employeeId: 'u4', date: todayStr, title: 'Submit weekly expense report', order: 3, completed: false, taskId: 't2', carriedFrom: null },
      { id: 'p4', employeeId: 'u4', date: todayStr, title: 'Check spare parts inventory in van', order: 4, completed: false, taskId: null, carriedFrom: null },
      { id: 'p5', employeeId: 'u4', date: todayStr, title: 'Replace circuit breaker - Warehouse 2', order: 5, completed: false, taskId: 't4', carriedFrom: yesterdayStr },
      { id: 'p6', employeeId: 'u4', date: yesterdayStr, title: 'Replace circuit breaker - Warehouse 2', order: 1, completed: false, taskId: 't4', carriedFrom: null },
      { id: 'p7', employeeId: 'u4', date: yesterdayStr, title: 'Router installation - Beira Residency', order: 2, completed: true, taskId: null, carriedFrom: null },
      { id: 'p8', employeeId: 'u4', date: tomorrowStr, title: 'Client follow-up call - Nimal Traders', order: 1, completed: false, taskId: 't3', carriedFrom: null }
    ],

    activityFeed: [
      { id: 'a1', userId: 'u4', message: 'completed task "Install new router - Beira Residency"', time: iso(addDays(today, -2)) + 'T15:10' },
      { id: 'a2', userId: 'u5', message: 'logged 1h 45m of work at Galle Rd Solar Farm', time: `${todayStr}T09:45` },
      { id: 'a3', userId: 'u6', message: 'completed task "Fiber splicing - Matara exchange"', time: `${todayStr}T13:05` },
      { id: 'a4', userId: 'u4', message: 'added a new work log for Nimal Traders', time: `${todayStr}T12:35` },
      { id: 'a5', userId: 'u7', message: 'account disabled by manager', time: iso(addDays(today, -5)) + 'T11:00' },
      { id: 'a6', userId: 'u5', message: 'marked task "Replace water pump seal" as overdue', time: yesterdayStr + 'T17:00' }
    ]
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
  return seed;
}

function loadDatabase() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedDatabase();
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.warn('FWMS: corrupted local database, reseeding.', e);
    return seedDatabase();
  }
}

function saveDatabase(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

/* Simple id generator good enough for a client-only prototype */
function generateId(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* Wrap any synchronous DB operation in a Promise to mimic a real API call */
function simulate(fn) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(fn()), NETWORK_DELAY);
  });
}

/* ---------------------------------------------------------------------------
 * PUBLIC API  — this is the ONLY surface the rest of the app talks to.
 * Swap the internals for real fetch() calls when a backend is ready.
 * ------------------------------------------------------------------------- */
const API = {

  /* ---------------- USERS ---------------- */
  users: {
    getAll: () => simulate(() => loadDatabase().users),
    getById: (id) => simulate(() => loadDatabase().users.find(u => u.id === id) || null),
    getByEmail: (email) => simulate(() => loadDatabase().users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null),
    getEmployeesForManager: (managerId) => simulate(() => loadDatabase().users.filter(u => u.role === 'employee' && u.managerId === managerId)),
    getAllEmployees: () => simulate(() => loadDatabase().users.filter(u => u.role === 'employee')),
    getAllManagers: () => simulate(() => loadDatabase().users.filter(u => u.role === 'manager')),
    create: (user) => simulate(() => {
      const db = loadDatabase();
      const newUser = Object.assign({
        id: generateId('u'), status: 'active', joinDate: new Date().toISOString().split('T')[0],
        avatarColor: ['#3457D5', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6', '#0EA5E9'][Math.floor(Math.random() * 6)]
      }, user);
      db.users.push(newUser);
      saveDatabase(db);
      return newUser;
    }),
    update: (id, changes) => simulate(() => {
      const db = loadDatabase();
      const idx = db.users.findIndex(u => u.id === id);
      if (idx === -1) return null;
      db.users[idx] = Object.assign({}, db.users[idx], changes);
      saveDatabase(db);
      return db.users[idx];
    }),
    setStatus: (id, status) => API.users.update(id, { status }),
    resetPassword: (id, newPassword) => API.users.update(id, { password: newPassword })
  },

  /* ---------------- TASKS ---------------- */
  tasks: {
    getAll: () => simulate(() => loadDatabase().tasks),
    getById: (id) => simulate(() => loadDatabase().tasks.find(t => t.id === id) || null),
    getForUser: (userId) => simulate(() => loadDatabase().tasks.filter(t => t.assignedTo === userId)),
    getForUsers: (userIds) => simulate(() => loadDatabase().tasks.filter(t => userIds.includes(t.assignedTo))),
    create: (task) => simulate(() => {
      const db = loadDatabase();
      const newTask = Object.assign({ id: generateId('t'), createdDate: new Date().toISOString().split('T')[0], status: 'Pending' }, task);
      db.tasks.push(newTask);
      saveDatabase(db);
      return newTask;
    }),
    update: (id, changes) => simulate(() => {
      const db = loadDatabase();
      const idx = db.tasks.findIndex(t => t.id === id);
      if (idx === -1) return null;
      db.tasks[idx] = Object.assign({}, db.tasks[idx], changes);
      saveDatabase(db);
      return db.tasks[idx];
    }),
    remove: (id) => simulate(() => {
      const db = loadDatabase();
      db.tasks = db.tasks.filter(t => t.id !== id);
      saveDatabase(db);
      return true;
    })
  },

  /* ---------------- WORK LOGS ---------------- */
  workLogs: {
    getAll: () => simulate(() => loadDatabase().workLogs),
    getForUser: (userId) => simulate(() => loadDatabase().workLogs.filter(w => w.employeeId === userId)),
    getForUsers: (userIds) => simulate(() => loadDatabase().workLogs.filter(w => userIds.includes(w.employeeId))),
    create: (log) => simulate(() => {
      const db = loadDatabase();
      const newLog = Object.assign({ id: generateId('w'), status: 'Completed' }, log);
      db.workLogs.push(newLog);
      saveDatabase(db);
      return newLog;
    }),
    update: (id, changes) => simulate(() => {
      const db = loadDatabase();
      const idx = db.workLogs.findIndex(w => w.id === id);
      if (idx === -1) return null;
      db.workLogs[idx] = Object.assign({}, db.workLogs[idx], changes);
      saveDatabase(db);
      return db.workLogs[idx];
    }),
    remove: (id) => simulate(() => {
      const db = loadDatabase();
      db.workLogs = db.workLogs.filter(w => w.id !== id);
      saveDatabase(db);
      return true;
    })
  },

  /* ---------------- REMINDERS ---------------- */
  reminders: {
    getAll: () => simulate(() => loadDatabase().reminders),
    getForUser: (userId) => simulate(() => loadDatabase().reminders.filter(r => r.forUser === userId)),
    create: (reminder) => simulate(() => {
      const db = loadDatabase();
      const newReminder = Object.assign({ id: generateId('r'), seen: false }, reminder);
      db.reminders.push(newReminder);
      saveDatabase(db);
      return newReminder;
    }),
    update: (id, changes) => simulate(() => {
      const db = loadDatabase();
      const idx = db.reminders.findIndex(r => r.id === id);
      if (idx === -1) return null;
      db.reminders[idx] = Object.assign({}, db.reminders[idx], changes);
      saveDatabase(db);
      return db.reminders[idx];
    }),
    remove: (id) => simulate(() => {
      const db = loadDatabase();
      db.reminders = db.reminders.filter(r => r.id !== id);
      saveDatabase(db);
      return true;
    })
  },

  /* ---------------- DAILY PLANNER ---------------- */
  planner: {
    getForUserAndDate: (userId, date) => simulate(() =>
      loadDatabase().plannerItems.filter(p => p.employeeId === userId && p.date === date).sort((a, b) => a.order - b.order)
    ),
    create: (item) => simulate(() => {
      const db = loadDatabase();
      const newItem = Object.assign({ id: generateId('p'), completed: false, carriedFrom: null }, item);
      db.plannerItems.push(newItem);
      saveDatabase(db);
      return newItem;
    }),
    update: (id, changes) => simulate(() => {
      const db = loadDatabase();
      const idx = db.plannerItems.findIndex(p => p.id === id);
      if (idx === -1) return null;
      db.plannerItems[idx] = Object.assign({}, db.plannerItems[idx], changes);
      saveDatabase(db);
      return db.plannerItems[idx];
    }),
    reorder: (orderedIds) => simulate(() => {
      const db = loadDatabase();
      orderedIds.forEach((id, i) => {
        const item = db.plannerItems.find(p => p.id === id);
        if (item) item.order = i + 1;
      });
      saveDatabase(db);
      return true;
    }),
    remove: (id) => simulate(() => {
      const db = loadDatabase();
      db.plannerItems = db.plannerItems.filter(p => p.id !== id);
      saveDatabase(db);
      return true;
    })
  },

  /* ---------------- ACTIVITY FEED ---------------- */
  activity: {
    getRecent: (limit = 10) => simulate(() =>
      loadDatabase().activityFeed.slice().sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, limit)
    ),
    log: (userId, message) => simulate(() => {
      const db = loadDatabase();
      db.activityFeed.push({ id: generateId('a'), userId, message, time: new Date().toISOString() });
      saveDatabase(db);
      return true;
    })
  },

  /* ---------------- ADMIN / DEV UTILITY ---------------- */
  system: {
    resetDemoData: () => simulate(() => { seedDatabase(); return true; })
  }
};

// Ensure the database exists on first load of any page
loadDatabase();
