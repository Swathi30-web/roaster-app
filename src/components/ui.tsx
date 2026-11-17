import type { ReactNode } from 'react';
import type { Shift } from '../lib/types';

export const Spinner = ({ label = 'Loading…' }: { label?: string }) => (
  <div className="flex items-center justify-center gap-3 p-10 text-slate-500" role="status">
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />{label}
  </div>
);
export const Empty = ({ text = 'No records found.' }: { text?: string }) => (
  <div className="p-10 text-center text-sm text-slate-400">{text}</div>
);
export const ErrorBox = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div className="m-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
    <span>{message}</span>{onRetry && <button className="btn-secondary btn-sm" onClick={onRetry}>Retry</button>}
  </div>
);
export const PageHeader = ({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) => (
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div><h1 className="text-xl font-bold text-slate-800 sm:text-2xl">{title}</h1>{subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}</div>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
);
export const Modal = ({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) => (
  <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <div className={`card mt-8 w-full ${wide ? 'max-w-2xl' : 'max-w-lg'}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <h2 className="font-semibold text-slate-800">{title}</h2>
        <button onClick={onClose} className="text-xl leading-none text-slate-400 hover:text-slate-700" aria-label="Close">×</button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);
export const Field = ({ label, error, children }: { label: string; error?: string; children: ReactNode }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
    {children}
    {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
  </label>
);
const tone: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700', Inactive: 'bg-slate-200 text-slate-600', Paused: 'bg-amber-100 text-amber-700',
  Scheduled: 'bg-blue-100 text-blue-700', Confirmed: 'bg-emerald-100 text-emerald-700', Completed: 'bg-slate-200 text-slate-700',
  Missed: 'bg-red-100 text-red-700', Cancelled: 'bg-rose-50 text-rose-500 line-through',
};
export const Badge = ({ text }: { text: string }) => <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone[text] || 'bg-slate-100 text-slate-600'}`}>{text}</span>;
export const ShiftChip = ({ shift, small }: { shift?: Shift; small?: boolean }) =>
  shift ? <span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 font-medium text-white ${small ? 'text-[11px]' : 'text-xs'}`} style={{ background: shift.color }}>{shift.name}{!small && ` ${shift.startTime}–${shift.endTime}`}</span> : <span className="text-xs text-slate-400">—</span>;
export const StatCard = ({ label, value, hint, color }: { label: string; value: ReactNode; hint?: string; color: string }) => (
  <div className="card p-4"><div className={`mb-2 h-1 w-10 rounded ${color}`} /><div className="text-3xl font-bold text-slate-800">{value}</div><div className="text-sm text-slate-500">{label}</div>{hint && <div className="text-xs text-slate-400">{hint}</div>}</div>
);
export const Table = ({ head, children }: { head: ReactNode[]; children: ReactNode }) => (
  <div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr>{head.map((h, i) => <th key={i} className="th">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{children}</tbody></table></div>
);
