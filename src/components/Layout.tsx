import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import type { AppNotification, Role } from '../lib/types';

export const NAV: { to: string; label: string; icon: string; roles: Role[] }[] = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊', roles: ['admin', 'manager'] },
  { to: '/my-schedule', label: 'My Schedule', icon: '🗓️', roles: ['employee'] },
  { to: '/employees', label: 'Employees', icon: '👥', roles: ['admin', 'manager'] },
  { to: '/departments', label: 'Departments', icon: '🏢', roles: ['admin', 'manager'] },
  { to: '/shifts', label: 'Shifts', icon: '⏰', roles: ['admin', 'manager'] },
  { to: '/assignments', label: 'Shift Assignment', icon: '📝', roles: ['admin', 'manager'] },
  { to: '/rotations', label: 'Rotation Rules', icon: '🔄', roles: ['admin', 'manager'] },
  { to: '/roster', label: 'Roster Calendar', icon: '📅', roles: ['admin', 'manager'] },
  { to: '/reports', label: 'Reports', icon: '📈', roles: ['admin', 'manager'] },
  { to: '/notifications', label: 'Notifications', icon: '🔔', roles: ['admin', 'manager', 'employee'] },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const loc = useLocation();
  useEffect(() => {
    setOpen(false);
    if (user) api.list<AppNotification>('notifications', { userId: user.id, read: false }).then((n) => setUnread(n.length)).catch(() => {});
  }, [loc.pathname, user]);

  return (
    <div className="min-h-screen lg:flex">
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-slate-900 text-slate-200 transition lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="px-5 py-5 text-lg font-bold text-white">🗂️ ShiftRoster</div>
        <nav className="space-y-1 px-3">
          {NAV.filter((n) => user && n.roles.includes(user.role)).map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-brand-600 text-white' : 'hover:bg-slate-800'}`}>
              <span>{n.icon}</span>{n.label}
              {n.to === '/notifications' && unread > 0 && <span className="ml-auto rounded-full bg-red-500 px-2 text-xs text-white">{unread}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <button className="btn-secondary lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">☰</button>
          <div className="hidden text-sm text-slate-500 lg:block">Employee Shift Rotation & Roster Management</div>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm leading-tight"><div className="font-medium text-slate-800">{user?.name}</div><div className="text-xs capitalize text-slate-500">{user?.role}</div></div>
            <button className="btn-secondary" onClick={logout}>Logout</button>
          </div>
        </header>
        <main className="p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
