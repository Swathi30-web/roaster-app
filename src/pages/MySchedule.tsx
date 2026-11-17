import { api, errMsg, logActivity } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge, Empty, ErrorBox, PageHeader, ShiftChip, Spinner, Table } from '../components/ui';
import type { Assignment, Employee, RotationRule, Shift } from '../lib/types';
import { fmtDate, fmtHours, nextRotationDate, shiftMinutes, todayStr } from '../lib/utils';

export default function MySchedule() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const emp = user?.employeeId ? await api.get<Employee>('employees', user.employeeId) : null;
    if (!emp) return null;
    const [assignments, shifts, rules] = await Promise.all([
      api.list<Assignment>('assignments', { employeeId: emp.id, _sort: 'date', _order: 'asc' }),
      api.list<Shift>('shifts'), api.list<RotationRule>('rotationRules', { departmentId: emp.departmentId, status: 'Active' }),
    ]);
    return { emp, assignments, shifts, rules };
  });
  if (loading) return <Spinner />;
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return <div className="card"><Empty text="Your account is not linked to an employee record." /></div>;

  const today = todayStr();
  const sh = (id: number) => data.shifts.find((s) => s.id === id);
  const upcoming = data.assignments.filter((a) => a.date >= today && a.status !== 'Cancelled');
  const past = data.assignments.filter((a) => a.date < today).reverse().slice(0, 10);
  const todays = upcoming.find((a) => a.date === today);
  const hours = upcoming.slice(0, 7).reduce((t, a) => t + (sh(a.shiftId) ? shiftMinutes(sh(a.shiftId)!) - sh(a.shiftId)!.breakMinutes : 0), 0);

  const confirm = async (a: Assignment) => {
    try { await api.update('assignments', a.id, { status: 'Confirmed' }); await logActivity('status', 'Status changed', `Assignment #${a.id}`, `${data.emp.name} confirmed shift on ${a.date}`); toast('success', 'Shift confirmed.'); reload(); }
    catch (e) { toast('error', errMsg(e)); }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="My Schedule" subtitle={`${data.emp.name} · ${data.emp.designation}`} />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4"><div className="text-sm text-slate-500">Today</div><div className="mt-1">{todays ? <ShiftChip shift={sh(todays.shiftId)} /> : <span className="text-slate-400">No shift (day off)</span>}</div></div>
        <div className="card p-4"><div className="text-sm text-slate-500">Upcoming shifts</div><div className="text-2xl font-bold">{upcoming.length}</div></div>
        <div className="card p-4"><div className="text-sm text-slate-500">Next 7 shifts – working time</div><div className="text-2xl font-bold">{fmtHours(hours)}</div></div>
      </div>
      <div className="card"><h2 className="border-b border-slate-200 px-4 py-3 font-semibold">Upcoming rotations</h2>
        {data.rules.length === 0 ? <Empty text="No active rotation plans for your department." /> : <div className="divide-y divide-slate-100">{data.rules.map((r) => { const n = nextRotationDate(r); return <div key={r.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm"><span><b>{r.name}</b> <span className="text-slate-500">({r.type})</span></span><span className="text-slate-500">Next change: <b>{n ? fmtDate(n) : 'Completed'}</b></span></div>; })}</div>}
      </div>
      <div className="card"><h2 className="border-b border-slate-200 px-4 py-3 font-semibold">Upcoming shifts</h2>
        {upcoming.length === 0 ? <Empty text="No upcoming shifts assigned." /> : (
          <Table head={['Date', 'Shift', 'Break', 'Status', '']}>{upcoming.map((a) => <tr key={a.id}><td className="td">{fmtDate(a.date)}{a.date === today && <span className="ml-2 text-xs text-brand-600">Today</span>}</td><td className="td"><ShiftChip shift={sh(a.shiftId)} /></td><td className="td">{sh(a.shiftId)?.breakMinutes} min</td><td className="td"><Badge text={a.status} /></td><td className="td">{a.status === 'Scheduled' && <button className="btn-primary btn-sm" onClick={() => confirm(a)}>Confirm</button>}</td></tr>)}</Table>
        )}
      </div>
      <div className="card"><h2 className="border-b border-slate-200 px-4 py-3 font-semibold">Recent shifts</h2>
        {past.length === 0 ? <Empty text="No past shifts." /> : <Table head={['Date', 'Shift', 'Status']}>{past.map((a) => <tr key={a.id}><td className="td">{fmtDate(a.date)}</td><td className="td"><ShiftChip shift={sh(a.shiftId)} /></td><td className="td"><Badge text={a.status} /></td></tr>)}</Table>}
      </div>
    </div>
  );
}
