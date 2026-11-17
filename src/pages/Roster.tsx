import { useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Empty, ErrorBox, PageHeader, ShiftChip, Spinner, Badge } from '../components/ui';
import type { Assignment, Department, Employee, Shift } from '../lib/types';
import { addDays, fmtDate, parseYmd, startOfWeek, todayStr, ymd } from '../lib/utils';

type View = 'day' | 'week' | 'month';

export default function Roster() {
  const [view, setView] = useState<View>('week');
  const [anchor, setAnchor] = useState(todayStr());
  const [dept, setDept] = useState('');
  const [empId, setEmpId] = useState('');
  const [group, setGroup] = useState<'employee' | 'department'>('employee');

  const range = useMemo((): [string, string] => {
    if (view === 'day') return [anchor, anchor];
    if (view === 'week') { const s = startOfWeek(anchor); return [s, addDays(s, 6)]; }
    const d = parseYmd(anchor);
    const first = ymd(new Date(d.getFullYear(), d.getMonth(), 1));
    const last = ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    return [startOfWeek(first), addDays(startOfWeek(last), 6)];
  }, [view, anchor]);

  const { data, loading, error, reload } = useAsync(async () => {
    const [assignments, employees, shifts, departments] = await Promise.all([
      api.list<Assignment>('assignments', { date_gte: range[0], date_lte: range[1] }),
      api.list<Employee>('employees'), api.list<Shift>('shifts'), api.list<Department>('departments'),
    ]);
    return { assignments, employees, shifts, departments };
  }, [range[0], range[1]]);

  const move = (dir: number) => {
    if (view === 'month') { const d = parseYmd(anchor); setAnchor(ymd(new Date(d.getFullYear(), d.getMonth() + dir, 1))); }
    else setAnchor(addDays(anchor, dir * (view === 'week' ? 7 : 1)));
  };

  const title = view === 'day' ? fmtDate(anchor) : view === 'week' ? `${fmtDate(range[0])} – ${fmtDate(range[1])}` : parseYmd(anchor).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const body = () => {
    if (loading) return <Spinner />;
    if (error || !data) return <ErrorBox message={error} onRetry={reload} />;
    const emps = data.employees.filter((e) => e.status === 'Active' && (!dept || String(e.departmentId) === dept) && (!empId || String(e.id) === empId))
      .sort((a, b) => a.departmentId - b.departmentId || a.name.localeCompare(b.name));
    const visible = data.assignments.filter((a) => a.status !== 'Cancelled' && emps.some((e) => e.id === a.employeeId));
    if (emps.length === 0) return <Empty text="No employees match the selected filters." />;
    const shift = (id: number) => data.shifts.find((s) => s.id === id);
    const dn = (id: number) => data.departments.find((d) => d.id === id)?.name ?? '';
    const cell = (e: Employee, date: string) => visible.filter((a) => a.employeeId === e.id && a.date === date);

    if (view === 'month') {
      const first = parseYmd(anchor).getMonth();
      const days = Array.from({ length: 42 }, (_, i) => addDays(range[0], i)).filter((d, i) => i < 35 || parseYmd(d).getMonth() === first);
      const today = todayStr();
      return (
        <div className="overflow-x-auto"><div className="grid min-w-[700px] grid-cols-7 border-l border-t border-slate-200">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="border-b border-r border-slate-200 bg-slate-50 p-2 text-center text-xs font-semibold text-slate-500">{d}</div>)}
          {days.map((d) => {
            const items = visible.filter((a) => a.date === d);
            const other = parseYmd(d).getMonth() !== first;
            const byDept = group === 'department' ? [...new Set(items.map((a) => data.employees.find((e) => e.id === a.employeeId)!.departmentId))] : [];
            return (
              <div key={d} className={`min-h-[96px] border-b border-r border-slate-200 p-1 ${other ? 'bg-slate-50 opacity-60' : ''}`}>
                <button className={`mb-1 text-xs ${d === today ? 'rounded bg-brand-600 px-1 text-white' : 'text-slate-500'}`} onClick={() => { setAnchor(d); setView('day'); }}>{parseYmd(d).getDate()}</button>
                {group === 'department'
                  ? byDept.map((id) => <div key={id} className="truncate text-[11px] text-slate-700">{dn(id)}: <b>{items.filter((a) => data.employees.find((e) => e.id === a.employeeId)?.departmentId === id).length}</b></div>)
                  : <>{items.slice(0, 3).map((a) => <div key={a.id} className="mb-0.5 truncate rounded px-1 text-[11px] text-white" style={{ background: shift(a.shiftId)?.color }}>{data.employees.find((e) => e.id === a.employeeId)?.name.split(' ')[0]} · {shift(a.shiftId)?.name}</div>)}{items.length > 3 && <div className="text-[11px] text-slate-500">+{items.length - 3} more</div>}</>}
              </div>
            );
          })}
        </div></div>
      );
    }

    const cols = view === 'day' ? [anchor] : Array.from({ length: 7 }, (_, i) => addDays(range[0], i));
    const groups = group === 'department' ? [...new Set(emps.map((e) => e.departmentId))] : [0];
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-slate-50"><tr><th className="th">Employee</th>{cols.map((c) => <th key={c} className={`th ${c === todayStr() ? 'text-brand-600' : ''}`}>{parseYmd(c).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</th>)}</tr></thead>
          <tbody>
            {groups.map((g) => (
              <>
                {group === 'department' && <tr key={`g${g}`}><td colSpan={cols.length + 1} className="bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">{dn(g)}</td></tr>}
                {emps.filter((e) => group === 'employee' || e.departmentId === g).map((e) => (
                  <tr key={e.id} className="border-t border-slate-100">
                    <td className="td whitespace-nowrap font-medium">{e.name}{group === 'employee' && <div className="text-xs font-normal text-slate-400">{dn(e.departmentId)}</div>}</td>
                    {cols.map((c) => <td key={c} className="td">{cell(e, c).map((a) => <div key={a.id} className="mb-1 space-y-0.5"><ShiftChip shift={shift(a.shiftId)} small />{view === 'day' && <div className="flex items-center gap-1 text-xs text-slate-500">{shift(a.shiftId)?.startTime}–{shift(a.shiftId)?.endTime} <Badge text={a.status} /></div>}</div>)}{cell(e, c).length === 0 && <span className="text-xs text-slate-300">off</span>}</td>)}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Roster Calendar" subtitle="Daily, weekly and monthly schedules by employee or department" />
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
          <div className="flex overflow-hidden rounded-lg border border-slate-300">{(['day', 'week', 'month'] as View[]).map((v) => <button key={v} onClick={() => setView(v)} className={`px-3 py-2 text-sm capitalize ${view === v ? 'bg-brand-600 text-white' : 'bg-white hover:bg-slate-100'}`}>{v}</button>)}</div>
          <button className="btn-secondary" onClick={() => move(-1)} aria-label="Previous">‹</button>
          <button className="btn-secondary" onClick={() => setAnchor(todayStr())}>Today</button>
          <button className="btn-secondary" onClick={() => move(1)} aria-label="Next">›</button>
          <span className="mx-2 font-semibold text-slate-800">{title}</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <select className="input w-auto" value={dept} onChange={(e) => { setDept(e.target.value); setEmpId(''); }} aria-label="Department"><option value="">All departments</option>{data?.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            <select className="input w-auto" value={empId} onChange={(e) => setEmpId(e.target.value)} aria-label="Employee"><option value="">All employees</option>{data?.employees.filter((e) => !dept || String(e.departmentId) === dept).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
            <select className="input w-auto" value={group} onChange={(e) => setGroup(e.target.value as 'employee' | 'department')} aria-label="Group by"><option value="employee">View by employee</option><option value="department">View by department</option></select>
          </div>
        </div>
        {body()}
      </div>
    </div>
  );
}
