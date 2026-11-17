# ShiftRoster – Employee Shift Rotation & Roster Management System

React + TypeScript + Vite + Tailwind CSS + React Router + Axios, with JSON Server as the mock backend (no external APIs).

## Run locally
```bash
npm install
npm run dev        # starts JSON Server (http://localhost:3001) and Vite (http://localhost:5173)
npm run seed       # optional: regenerate db.json with demo data relative to today
npm run build      # production build -> dist/
```

## Demo accounts
| Role | Email | Password |
|---|---|---|
| Admin | admin@company.com | admin123 |
| Manager | manager@company.com | manager123 |
| Employee | aarav@company.com (any employee's first name) | password123 |

## Roles
- **Admin** – everything: employee / department / shift CRUD, assignments, rotations, calendar, reports.
- **Manager** – view employees/departments/shifts; assign shifts, manage rotation rules, calendar, reports, dashboard.
- **Employee** – My Schedule (upcoming shifts, confirm shift, upcoming rotations) and Notifications.
Routes are protected (login required, role-checked); unauthorised access redirects to the user's home page.

## Features → files
| Requirement | Where |
|---|---|
| Auth, role routes | `context/AuthContext.tsx`, `components/ProtectedRoute.tsx`, `App.tsx` |
| Employee / Department / Shift CRUD | `components/CrudPage.tsx` + `pages/Employees|Departments|Shifts.tsx` |
| Assignment (duplicate + overlap prevention, status tracking) | `pages/Assignments.tsx`, `lib/utils.ts#findConflict` |
| Weekly / monthly rotation rules + apply | `pages/Rotations.tsx`, `lib/rotation.ts` |
| Roster calendar (day/week/month, by employee/department) | `pages/Roster.tsx` |
| Notifications, activity history | `pages/Notifications.tsx`, `lib/api.ts#notify/logActivity` |
| Dashboard, Reports (+CSV export) | `pages/Dashboard.tsx`, `pages/Reports.tsx` |

Validation covers required fields, email format, dates, time format, break < shift length, past-date assignments, duplicate emails/names, and overnight shifts (e.g. 22:00–06:00). Every page shows loading, empty, error (with retry) and success (toast) states.

## JSON Server resources
`users, employees, departments, shifts, assignments, rotationRules, notifications, activityLogs` (see `db.json`).

## Deployment (Netlify / Vercel)
`netlify.toml` and `vercel.json` are included (SPA rewrites). JSON Server is a Node process, so a static host cannot run it:
1. Host the API somewhere that runs Node (e.g. Render/Railway): start command `npx json-server --host 0.0.0.0 --port $PORT db.json`.
2. Deploy the frontend to Netlify/Vercel with env var `VITE_API_URL=https://<your-api-host>`.
(Note: free hosts may reset `db.json` on restart.)
