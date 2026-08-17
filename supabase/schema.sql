-- ============================================================================
-- FieldPro (FWMS) — Supabase schema + demo data
-- ----------------------------------------------------------------------------
-- Run this ONCE: Supabase dashboard → SQL Editor → paste this whole file →
-- Run. That's the entire backend setup — no CLI, no npm, no functions.
--
-- Column names are camelCase and quoted (e.g. "dueDate") on purpose, so they
-- match the field names js/data.js already sends/expects — no snake_case
-- translation layer needed anywhere.
--
-- Table names are also camelCase for multi-word entities ("workLogs",
-- "plannerItems", "activityFeed") to match the collection names used
-- throughout the app.
-- ============================================================================

-- ---------------------------------------------------------------- USERS ----
create table if not exists users (
  id            text primary key,
  role          text not null check (role in ('super_admin','manager','employee')),
  name          text not null,
  email         text not null unique,
  password      text not null,
  phone         text,
  "avatarColor" text,
  status        text not null default 'active',
  "managerId"   text references users(id) on delete set null,
  title         text,
  "joinDate"    date
);

-- ---------------------------------------------------------------- TASKS ----
create table if not exists tasks (
  id            text primary key,
  title         text not null,
  description   text,
  priority      text,
  "dueDate"     date,
  status        text not null default 'Pending',
  reminder      boolean not null default false,
  "createdBy"   text references users(id) on delete set null,
  "assignedTo"  text references users(id) on delete set null,
  "createdDate" date
);

-- ------------------------------------------------------------ WORK LOGS ----
create table if not exists "workLogs" (
  id                text primary key,
  "employeeId"      text references users(id) on delete set null,
  date              date,
  "startTime"       text,
  "endTime"         text,
  "clientName"      text,
  location          text,
  description       text,
  "issueIdentified" text,
  "actionTaken"     text,
  "timeSpent"       text,
  status            text not null default 'Completed',
  remarks           text,
  attachment        text
);

-- ------------------------------------------------------------ REMINDERS ----
create table if not exists reminders (
  id            text primary key,
  title         text not null,
  message       text,
  datetime      timestamp,
  "createdBy"   text references users(id) on delete set null,
  "forUser"     text references users(id) on delete set null,
  seen          boolean not null default false
);

-- -------------------------------------------------------- PLANNER ITEMS ----
-- Note: the sort-order column is called "sortOrder", not "order" — `order`
-- is a reserved query keyword in Supabase's REST API (used for sorting), so
-- a column literally named that would be unreachable via the API.
create table if not exists "plannerItems" (
  id            text primary key,
  "employeeId"  text references users(id) on delete set null,
  date          date,
  title         text not null,
  "sortOrder"   integer not null default 1,
  completed     boolean not null default false,
  "taskId"      text,
  "carriedFrom" date
);

-- --------------------------------------------------------- ACTIVITY FEED ---
create table if not exists "activityFeed" (
  id        text primary key,
  "userId"  text references users(id) on delete set null,
  message   text,
  time      timestamp
);

-- ============================================================================
-- ACCESS: grants + a permissive policy for the public "anon" role.
-- This is a prototype: any visitor with the site's anon key can read/write
-- everything, same level of openness the app has always had (it never had
-- server-side auth checks even behind Netlify Functions). Don't put real
-- sensitive data in here without adding real per-row policies first.
-- ============================================================================
grant select, insert, update, delete on
  users, tasks, "workLogs", reminders, "plannerItems", "activityFeed"
to anon;

alter table users enable row level security;
alter table tasks enable row level security;
alter table "workLogs" enable row level security;
alter table reminders enable row level security;
alter table "plannerItems" enable row level security;
alter table "activityFeed" enable row level security;

create policy "anon full access" on users for all to anon using (true) with check (true);
create policy "anon full access" on tasks for all to anon using (true) with check (true);
create policy "anon full access" on "workLogs" for all to anon using (true) with check (true);
create policy "anon full access" on reminders for all to anon using (true) with check (true);
create policy "anon full access" on "plannerItems" for all to anon using (true) with check (true);
create policy "anon full access" on "activityFeed" for all to anon using (true) with check (true);

-- ============================================================================
-- DEMO SEED DATA — dates computed relative to right now, so today/yesterday/
-- tomorrow line up whenever you run this.
-- ============================================================================

insert into users (id, role, name, email, password, phone, "avatarColor", status, "managerId", title, "joinDate") values
('u1','super_admin','Alex Morgan','admin@fwms.com','password123','+94 71 234 5678','#3457D5','active',null,'Super Administrator','2022-01-10'),
('u2','manager','Priya Sharma','priya.manager@fwms.com','password123','+94 71 987 6543','#14B8A6','active',null,'Field Operations Manager','2022-03-14'),
('u3','manager','David Chen','david.manager@fwms.com','password123','+94 76 555 1122','#F59E0B','active',null,'Regional Manager - South','2022-05-02'),
('u4','employee','Ravi Kumar','ravi.employee@fwms.com','password123','+94 77 111 2233','#3457D5','active','u2','Field Service Engineer','2023-02-20'),
('u5','employee','Sarah Lee','sarah.employee@fwms.com','password123','+94 77 444 5566','#EF4444','active','u2','Field Technician','2023-06-11'),
('u6','employee','Mohammed Ali','mohammed.employee@fwms.com','password123','+94 70 222 9988','#8B5CF6','active','u3','Installation Specialist','2023-08-01'),
('u7','employee','Nadia Fernando','nadia.employee@fwms.com','password123','+94 77 888 3344','#0EA5E9','disabled','u3','Field Technician','2022-11-19')
on conflict (id) do nothing;

insert into tasks (id, title, description, priority, "dueDate", status, reminder, "createdBy", "assignedTo", "createdDate") values
('t1','Site inspection - Colombo Tower','Perform routine inspection of HVAC units on floors 4-6.','High',current_date,'In Progress',true,'u2','u4',current_date - 1),
('t2','Submit weekly expense report','Compile fuel and material receipts for the week.','Medium',current_date,'Pending',true,'u4','u4',current_date - 1),
('t3','Client follow-up call - Nimal Traders','Confirm satisfaction after generator repair.','Low',current_date + 1,'Pending',false,'u4','u4',current_date),
('t4','Replace faulty circuit breaker','Panel B, warehouse 2. Part already ordered.','High',current_date - 1,'Pending',true,'u2','u4',current_date - 3),
('t5','Vehicle maintenance checkup','Service van FWD-2214 at authorized garage.','Medium',current_date + 2,'Pending',true,'u4','u4',current_date),
('t6','Quarterly safety training','Attend mandatory safety refresher at HQ.','Medium',current_date + 5,'Pending',true,'u2','u4',current_date - 1),
('t7','Install new router - Beira Residency','Setup and configure network hardware.','High',current_date - 2,'Completed',false,'u2','u4',current_date - 6),
('t8','Update client contact database','Sync new numbers collected in the field.','Low',current_date - 4,'Completed',false,'u4','u4',current_date - 8),
('t9','Solar panel cleaning - Galle Rd site','Bi-weekly cleaning and output check.','Medium',current_date,'In Progress',true,'u2','u5',current_date - 1),
('t10','Replace water pump seal','Client reported leakage near intake valve.','High',current_date - 1,'Pending',true,'u2','u5',current_date - 2),
('t11','Prepare monthly site report','Summarize all visits for Kandy region.','Medium',current_date + 3,'Pending',false,'u5','u5',current_date),
('t12','Fiber splicing - Matara exchange','New line splicing for enterprise client.','High',current_date,'Pending',true,'u3','u6',current_date - 1),
('t13','CCTV camera realignment','Adjust angles after building renovation.','Low',current_date + 1,'Pending',false,'u6','u6',current_date)
on conflict (id) do nothing;

insert into "workLogs" (id, "employeeId", date, "startTime", "endTime", "clientName", location, description, "issueIdentified", "actionTaken", "timeSpent", status, remarks, attachment) values
('w1','u4',current_date,'08:30','10:15','Colombo Tower Mgmt','Colombo 03','Inspected HVAC units on floor 4 and 5.','Unit 5B compressor noise.','Lubricated bearings, monitored for 20 min.','1h 45m','Completed','Recommend replacement within 3 months.','inspection_photo_01.jpg'),
('w2','u4',current_date,'11:00','12:30','Nimal Traders','Wellawatte','Generator repair follow-up visit.','Fuel line minor leak.','Replaced gasket and tested under load.','1h 30m','Completed','Client satisfied, no further issues.',''),
('w3','u4',current_date - 1,'09:00','11:00','Beira Residency','Colombo 02','Router installation and network configuration.','ISP signal instability.','Configured backup failover and tested speeds.','2h 00m','Completed','Follow-up scheduled next month.','network_config.pdf'),
('w4','u4',current_date - 1,'13:30','15:00','Warehouse 2 - ACME Logistics','Peliyagoda','Diagnosed circuit breaker fault on Panel B.','Breaker tripping under load.','Isolated circuit pending replacement part.','1h 30m','In Progress','Part ordered, revisit required.',''),
('w5','u5',current_date,'08:00','09:45','Galle Rd Solar Farm','Galle Road','Bi-weekly solar panel cleaning, row A-C.','Dust accumulation reducing output ~8%.','Cleaned panels, logged new output readings.','1h 45m','In Progress','Rows D-F scheduled for tomorrow.','output_readings.csv'),
('w6','u5',current_date - 1,'10:00','11:30','Hillcrest Apartments','Kandy','Water pump seal inspection.','Leakage at intake valve confirmed.','Temporary seal applied, part requested.','1h 30m','Pending','Return visit required with new seal.',''),
('w7','u6',current_date,'09:00','13:00','Matara Exchange','Matara','Fiber splicing for new enterprise connection.','Existing duct partially blocked.','Cleared duct, completed 12 splices.','4h 00m','Completed','Line tested at full capacity.','splice_test_results.pdf'),
('w8','u6',current_date - 1,'14:00','15:20','Southgate Mall','Matara','CCTV camera realignment after renovation.','Two cameras with obstructed view.','Repositioned and re-tested feeds.','1h 20m','Completed','','')
on conflict (id) do nothing;

insert into reminders (id, title, message, datetime, "createdBy", "forUser", seen) values
('r1','Call client before site visit','Confirm arrival time with Colombo Tower facilities team.',current_date + time '08:00','u4','u4',false),
('r2','Submit expense report','Deadline is end of day today.',current_date + time '16:00','u4','u4',false),
('r3','Vehicle service reminder','Van FWD-2214 due for maintenance in 2 days.',(current_date + 1) + time '09:00','u4','u4',false),
('r4','Team meeting - weekly sync','Join the 9:30 AM call with the operations team.',current_date + time '09:30','u2','u4',true),
('r5','Safety training enrollment closes','Confirm your seat for the quarterly refresher.',(current_date + 4) + time '12:00','u2','u4',false),
('r6','Review pending tasks','Two tasks are overdue and need attention.',current_date + time '07:30','u2','u2',false)
on conflict (id) do nothing;

insert into "plannerItems" (id, "employeeId", date, title, "sortOrder", completed, "taskId", "carriedFrom") values
('p1','u4',current_date,'Inspect HVAC units - Colombo Tower',1,true,'t1',null),
('p2','u4',current_date,'Follow-up call - Nimal Traders',2,true,null,null),
('p3','u4',current_date,'Submit weekly expense report',3,false,'t2',null),
('p4','u4',current_date,'Check spare parts inventory in van',4,false,null,null),
('p5','u4',current_date,'Replace circuit breaker - Warehouse 2',5,false,'t4',current_date - 1),
('p6','u4',current_date - 1,'Replace circuit breaker - Warehouse 2',1,false,'t4',null),
('p7','u4',current_date - 1,'Router installation - Beira Residency',2,true,null,null),
('p8','u4',current_date + 1,'Client follow-up call - Nimal Traders',1,false,'t3',null)
on conflict (id) do nothing;

insert into "activityFeed" (id, "userId", message, time) values
('a1','u4','completed task "Install new router - Beira Residency"',(current_date - 2) + time '15:10'),
('a2','u5','logged 1h 45m of work at Galle Rd Solar Farm',current_date + time '09:45'),
('a3','u6','completed task "Fiber splicing - Matara exchange"',current_date + time '13:05'),
('a4','u4','added a new work log for Nimal Traders',current_date + time '12:35'),
('a5','u7','account disabled by manager',(current_date - 5) + time '11:00'),
('a6','u5','marked task "Replace water pump seal" as overdue',(current_date - 1) + time '17:00')
on conflict (id) do nothing;
