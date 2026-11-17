import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../lib/api';
import { Field } from '../components/ui';

const DEMO = [
  ['Admin', 'admin@company.com', 'admin123'],
  ['Manager', 'manager@company.com', 'manager123'],
  ['Employee', 'aarav@company.com', 'password123'],
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return setError('Email and password are required.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email address.');
    setBusy(true); setError('');
    try { await login(email, password); nav('/'); }
    catch (err) { setError(err instanceof Error && err.message.startsWith('Invalid') ? err.message : errMsg(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 to-slate-100 p-4">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4 p-6" noValidate>
        <div className="text-center"><div className="text-3xl">🗂️</div><h1 className="text-2xl font-bold text-slate-800">ShiftRoster</h1><p className="text-sm text-slate-500">Sign in to manage shifts & rosters</p></div>
        {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}
        <Field label="Email"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" /></Field>
        <Field label="Password"><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></Field>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
          <div className="mb-1 font-semibold">Demo accounts (click to fill)</div>
          {DEMO.map(([r, e, p]) => <button type="button" key={r} className="block w-full py-0.5 text-left hover:text-brand-600" onClick={() => { setEmail(e); setPassword(p); }}><b>{r}:</b> {e} / {p}</button>)}
        </div>
      </form>
    </div>
  );
}
