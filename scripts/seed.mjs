// Generates db.json with demo data relative to today's date.  Run: npm run seed
import { writeFileSync } from 'node:fs';
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today = new Date(); today.setHours(0, 0, 0, 0);
const monday = addDays(today, -((today.getDay() + 6) % 7));
const iso = (d, h = 9) => { const x = new Date(d); x.setHours(h, 0, 0, 0); return x.toISOString(); };

const departments = [
  { id: 1, name: 'Operations', description: 'Plant and floor operations' },
  { id: 2, name: 'Customer Support', description: 'Help desk and customer care' },
  { id: 3, name: 'Security', description: 'Site security and monitoring' },
  { id: 4, name: 'Warehouse', description: 'Inventory and logistics' },
];
const shifts = [
  { id: 1, name: 'Morning', startTime: '06:00', endTime: '14:00', breakMinutes: 30, color: '#f59e0b', status: 'Active' },
  { id: 2, name: 'Afternoon', startTime: '14:00', endTime: '22:00', breakMinutes: 30, color: '#3b82f6', status: 'Active' },
  { id: 3, name: 'Night', startTime: '22:00', endTime: '06:00', breakMinutes: 45, color: '#6366f1', status: 'Active' },
  { id: 4, name: 'General', startTime: '09:00', endTime: '17:00', breakMinutes: 60, color: '#10b981', status: 'Active' },
];
const names = [
  ['Aarav Sharma', 1, 'Operations Lead'], ['Priya Nair', 1, 'Machine Operator'], ['Rohan Mehta', 1, 'Technician'],
  ['Ananya Iyer', 2, 'Support Lead'], ['Karthik Raj', 2, 'Support Agent'], ['Sneha Reddy', 2, 'Support Agent'],
  ['Vikram Singh', 3, 'Security Supervisor'], ['Meera Pillai', 3, 'Security Officer'], ['Arjun Das', 3, 'Security Officer'],
  ['Divya Menon', 4, 'Warehouse Manager'], ['Suresh Kumar', 4, 'Inventory Clerk'], ['Lakshmi Narayan', 4, 'Loader'],
];
const employees = names.map(([name, departmentId, designation], i) => ({
  id: i + 1, name, email: `${name.split(' ')[0].toLowerCase()}@company.com`, departmentId, designation,
  status: i === 11 ? 'Inactive' : 'Active',
}));
const users = [
  { id: 1, name: 'Admin User', email: 'admin@company.com', password: 'admin123', role: 'admin' },
  { id: 2, name: 'Maya Manager', email: 'manager@company.com', password: 'manager123', role: 'manager' },
  ...employees.map((e) => ({ id: e.id + 2, name: e.name, email: e.email, password: 'password123', role: 'employee', employeeId: e.id })),
];
const userOf = (empId) => users.find((u) => u.employeeId === empId).id;

const assignments = [];
let aid = 1;
employees.filter((e) => e.status === 'Active').forEach((e, idx) => {
  for (let w = 0; w < 2; w++) {
    for (let d = 0; d < 5; d++) {
      const date = addDays(monday, w * 7 + d);
      const ds = ymd(date);
      if ((idx + d + w) % 11 === 0) continue; // a few days off
      const shiftId = e.departmentId === 1 ? ((idx + w) % 3) + 1 : e.departmentId === 4 ? 4 : e.departmentId === 2 ? ((idx + w) % 2) + 1 : ((idx + w) % 3) + 1;
      const status = date < today ? 'Completed' : ds === ymd(today) ? 'Confirmed' : 'Scheduled';
      assignments.push({ id: aid++, employeeId: e.id, shiftId, date: ds, status, createdBy: 'Maya Manager', ...(e.departmentId === 1 ? { rotationRuleId: 1 } : {}) });
    }
  }
});
const rotationRules = [
  { id: 1, name: 'Operations Weekly Rotation', type: 'weekly', departmentId: 1, shiftIds: [1, 2, 3], startDate: ymd(monday), periods: 2, status: 'Active', lastAppliedAt: iso(addDays(monday, -2)) },
  { id: 2, name: 'Support Monthly Rotation', type: 'monthly', departmentId: 2, shiftIds: [1, 2], startDate: ymd(new Date(today.getFullYear(), today.getMonth() + 1, 1)), periods: 3, status: 'Active' },
];
const notifications = [
  { id: 1, userId: 1, message: 'Welcome to ShiftRoster! Start by reviewing the dashboard.', type: 'info', read: false, createdAt: iso(today, 8) },
  { id: 2, userId: 2, message: 'Rotation rule "Support Monthly Rotation" starts next month.', type: 'rotation', read: false, createdAt: iso(today, 8) },
  { id: 3, userId: userOf(1), message: `You have been assigned to a shift on ${ymd(addDays(monday, 7))}.`, type: 'assignment', read: false, createdAt: iso(addDays(today, -1), 17) },
  { id: 4, userId: userOf(1), message: 'Upcoming rotation: "Operations Weekly Rotation" changes your shift next week.', type: 'rotation', read: false, createdAt: iso(today, 8) },
];
const activityLogs = [
  { id: 1, action: 'Applied rotation', entity: 'RotationRule #1', details: 'Operations Weekly Rotation applied for 2 week(s); 10 assignment(s) created', actor: 'Maya Manager', type: 'rotation', createdAt: iso(addDays(monday, -2), 10) },
  { id: 2, action: 'Created employee', entity: 'Employee #12', details: 'Lakshmi Narayan added to Warehouse', actor: 'Admin User', type: 'employee', createdAt: iso(addDays(monday, -5), 11) },
  { id: 3, action: 'Created shift', entity: 'Shift #4', details: 'General shift 09:00-17:00', actor: 'Admin User', type: 'shift', createdAt: iso(addDays(monday, -6), 9) },
];
writeFileSync(new URL('../db.json', import.meta.url), JSON.stringify({ users, departments, employees, shifts, assignments, rotationRules, notifications, activityLogs }, null, 2));
console.log(`db.json generated: ${employees.length} employees, ${assignments.length} assignments`);
