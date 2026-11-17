import { createContext, useContext, useState, type ReactNode } from 'react';
import { api, logActivity, setActor } from '../lib/api';
import type { User } from '../lib/types';

interface AuthCtx { user: User | null; login: (email: string, password: string) => Promise<void>; logout: () => void }
const Ctx = createContext<AuthCtx>(null!);
export const useAuth = () => useContext(Ctx);

const KEY = 'roster_user';
const stored = (): User | null => { try { const u = JSON.parse(localStorage.getItem(KEY) || 'null'); if (u) setActor(u.name); return u; } catch { return null; } };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(stored);

  const login = async (email: string, password: string) => {
    const found = await api.list<User>('users', { email: email.trim().toLowerCase(), password });
    if (!found.length) throw new Error('Invalid email or password.');
    const { password: _pw, ...safe } = found[0];
    localStorage.setItem(KEY, JSON.stringify(safe));
    setActor(safe.name); setUser(safe);
    logActivity('auth', 'Logged in', `User #${safe.id}`, `${safe.name} (${safe.role}) signed in`);
  };
  const logout = () => {
    if (user) logActivity('auth', 'Logged out', `User #${user.id}`, `${user.name} signed out`);
    localStorage.removeItem(KEY); setUser(null);
  };
  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}
