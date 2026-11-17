import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Badge, Empty, ErrorBox, PageHeader, ShiftChip, Spinner, StatCard } from '../components/ui';
import type { ActivityLog, Assignment, Employee, RotationRule, Shift } from '../lib/types';
import { fmtDate, fmtDateTime, nextRotationDate, todayStr } from '../lib/utils';

export default function Dashboard() {
  const today = todayStr();
  const { data, loading, error, reload } = useAsync(async () => {
    const [employees, shifts, todays, rules, logs] = await Promise.all([
      api.list<Employee>('employees'), api.list<Shift>('shifts'), api.list<Assignment>('assignments', { date: today }),
      api.list<RotationRule>('rotationRules'), api.list<ActivityLog>('activityLogs', { _sort: 'createdAt', _order: 'desc', _limit: 8 }),
    ]);
    return { employees, shifts, todays: todays.filter((a) => a.status !== 'Cancelled'), rules, logs };
  });
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error} onRetry={reload} />;

  const upcoming = data.rules.filter((r) => r.status === 'Active').map((r) => ({ r, next: nextRotationDate(r, today) })).filter((x) => x.next).sort((a, b) => a.next!.localeCompare(b.next!));
  const by = data.shifts.map((s) => ({ s, n: data.todays.filter((a) => a.shiftId === s.id).length }));
  const max = Math.max(1, ...by.map((x) => x.n));

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" subtitle={fmtDate(today)} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total employees" value={data.employees.length} hint={`${data.employees.filter((e) => e.status === 'Active').length} active`} color="bg-brand-500" />
        <StatCard label="Active shifts" value={data.shifts.filter((s) => s.status === 'Active').length} color="bg-emerald-500" />
        <StatCard label="Today's assignments" value={data.todays.length} color="bg-amber-500" />
        <StatCard label="Upcoming rotations" value={upcoming.length} hint="active rules with a pending change" color="bg-rose-500" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-4"><h2 className="mb-3 font-semibold">Today's allocation by shift</h2>
          <div className="space-y-2">{by.map(({ s, n }) => <div key={s.id} className="flex items-center gap-3 text-sm"><span className="w-24 shrink-0">{s.name}</span><div className="h-4 flex-1 rounded bg-slate-100"><div className="h-4 rounded" style={{ width: `${(n / max) * 100}%`, background: s.color }} /></div><b className="w-6 text-right">{n}</b></div>)}</div>
        </div>
        <div className="card"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="font-semibold">Upcoming rotations</h2><Link to="/rotations" className="text-xs text-brand-600">Manage →</Link></div>
          {upcoming.length === 0 ? <Empty text="No upcoming rotations." /> : <div className="divide-y divide-slate-100">{upcoming.map(({ r, next }) => <div key={r.id} className="flex justify-between gap-2 px-4 py-3 text-sm"><span>{r.name}</span><span className="text-slate-500">{fmtDate(next!)}</span></div>)}</div>}
        </div>
        <div className="card"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="font-semibold">Today's roster</h2><Link to="/roster" className="text-xs text-brand-600">Open calendar →</Link></div>
          {data.todays.length === 0 ? <Empty text="No assignments today." /> : <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">{data.todays.map((a) => <div key={a.id} className="flex items-center justify-between gap-2 px-4 py-2 text-sm"><span>{data.employees.find((e) => e.id === a.employeeId)?.name}</span><span className="flex items-center gap-2"><ShiftChip shift={data.shifts.find((s) => s.id === a.shiftId)} small /><Badge text={a.status} /></span></div>)}</div>}
        </div>
        <div className="card"><div className="flex items-center justify-between border-b border-slate-200 px-4 py-3"><h2 className="font-semibold">Recent activity</h2><Link to="/reports" className="text-xs text-brand-600">All activity →</Link></div>
          {data.logs.length === 0 ? <Empty text="No activity yet." /> : <div className="divide-y divide-slate-100">{data.logs.map((l) => <div key={l.id} className="px-4 py-2 text-sm"><b>{l.action}</b> — {l.details}<div className="text-xs text-slate-400">{l.actor} · {fmtDateTime(l.createdAt)}</div></div>)}</div>}
        </div>
      </div>
    </div>
  );
}
