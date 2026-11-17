import { useState } from 'react';
import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { Badge, Empty, ErrorBox, PageHeader, ShiftChip, Spinner, Table } from '../components/ui';
import type { ActivityLog, Assignment, Department, Employee, LogType, RotationRule, Shift } from '../lib/types';
import { addDays, downloadCsv, fmtDate, fmtDateTime, nextRotationDate, startOfWeek, todayStr } from '../lib/utils';

const TABS = ['Department schedules', 'Shift allocation', 'Rotation history', 'Activity log'] as const;

export default function Reports() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Department schedules');
  const [from, setFrom] = useState(startOfWeek(todayStr()));
  const [to, setTo] = useState(addDays(startOfWeek(todayStr()), 13));
  const [dept, setDept] = useState('');
  const [logType, setLogType] = useState('');
  const { data, loading, error, reload } = useAsync(async () => {
    const [assignments, employees, shifts, departments, rules, logs] = await Promise.all([
      api.list<Assignment>('assignments'), api.list<Employee>('employees'), api.list<Shift>('shifts'), api.list<Department>('departments'),
      api.list<RotationRule>('rotationRules'), api.list<ActivityLog>('activityLogs', { _sort: 'createdAt', _order: 'desc' }),
    ]);
    return { assignments, employees, shifts, departments, rules, logs };
  });
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error} onRetry={reload} />;

  const emp = (id: number) => data.employees.find((e) => e.id === id);
  const sh = (id: number) => data.shifts.find((s) => s.id === id);
  const dn = (id?: number) => data.departments.find((d) => d.id === id)?.name ?? '—';
  const inRange = data.assignments.filter((a) => a.date >= from && a.date <= to && a.status !== 'Cancelled');

  const schedRows = inRange.filter((a) => !dept || String(emp(a.employeeId)?.departmentId) === dept)
    .sort((a, b) => dn(emp(a.employeeId)?.departmentId).localeCompare(dn(emp(b.employeeId)?.departmentId)) || (emp(a.employeeId)?.name ?? '').localeCompare(emp(b.employeeId)?.name ?? '') || a.date.localeCompare(b.date));
  const matrix = data.departments.map((d) => ({ d, counts: data.shifts.map((s) => inRange.filter((a) => a.shiftId === s.id && emp(a.employeeId)?.departmentId === d.id).length) }));
  const logs = data.logs.filter((l) => !logType || l.type === logType);
  const rotLogs = data.logs.filter((l) => l.type === 'rotation');

  const exportCsv = () => {
    if (tab === 'Department schedules') downloadCsv('department-schedules.csv', [['Department', 'Employee', 'Date', 'Shift', 'Start', 'End', 'Status'], ...schedRows.map((a) => [dn(emp(a.employeeId)?.departmentId), emp(a.employeeId)?.name ?? '', a.date, sh(a.shiftId)?.name ?? '', sh(a.shiftId)?.startTime ?? '', sh(a.shiftId)?.endTime ?? '', a.status])]);
    else if (tab === 'Shift allocation') downloadCsv('shift-allocation.csv', [['Department', ...data.shifts.map((s) => s.name), 'Total'], ...matrix.map((m) => [m.d.name, ...m.counts, m.counts.reduce((x, y) => x + y, 0)])]);
    else downloadCsv(tab === 'Rotation history' ? 'rotation-history.csv' : 'activity-log.csv', [['Time', 'Actor', 'Action', 'Entity', 'Details'], ...(tab === 'Rotation history' ? rotLogs : logs).map((l) => [l.createdAt, l.actor, l.action, l.entity, l.details])]);
  };
  const dateFilter = tab === 'Department schedules' || tab === 'Shift allocation';

  return (
    <div>
      <PageHeader title="Reports" subtitle="Schedules, allocation summaries, rotation history and activity"><button className="btn-secondary" onClick={exportCsv}>⬇ Export CSV</button></PageHeader>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">{TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{t}</button>)}</div>
      <div className="card">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
          {dateFilter && <><label className="text-sm text-slate-500">From</label><input type="date" className="input w-auto" value={from} onChange={(e) => setFrom(e.target.value)} /><label className="text-sm text-slate-500">To</label><input type="date" className="input w-auto" value={to} onChange={(e) => setTo(e.target.value)} /></>}
          {tab === 'Department schedules' && <select className="input w-auto" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department"><option value="">All departments</option>{data.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}
          {tab === 'Activity log' && <select className="input w-auto" value={logType} onChange={(e) => setLogType(e.target.value as LogType)} aria-label="Type"><option value="">All activity</option>{['assignment', 'rotation', 'status', 'employee', 'shift', 'department', 'auth'].map((t) => <option key={t}>{t}</option>)}</select>}
          {dateFilter && from > to && <span className="text-sm text-red-600">"From" must not be after "To".</span>}
        </div>
        {tab === 'Department schedules' && (schedRows.length === 0 ? <Empty text="No schedules in this range." /> : (
          <Table head={['Department', 'Employee', 'Date', 'Shift', 'Hours', 'Status']}>{schedRows.map((a) => <tr key={a.id}><td className="td">{dn(emp(a.employeeId)?.departmentId)}</td><td className="td font-medium">{emp(a.employeeId)?.name}</td><td className="td whitespace-nowrap">{fmtDate(a.date)}</td><td className="td"><ShiftChip shift={sh(a.shiftId)} small /></td><td className="td">{sh(a.shiftId)?.startTime}–{sh(a.shiftId)?.endTime}</td><td className="td"><Badge text={a.status} /></td></tr>)}</Table>
        ))}
        {tab === 'Shift allocation' && (
          <div className="p-4"><Table head={['Department', ...data.shifts.map((s) => s.name), 'Total']}>{matrix.map((m) => <tr key={m.d.id}><td className="td font-medium">{m.d.name}</td>{m.counts.map((c, i) => <td key={i} className="td">{c}</td>)}<td className="td font-bold">{m.counts.reduce((x, y) => x + y, 0)}</td></tr>)}
            <tr className="bg-slate-50"><td className="td font-bold">Total</td>{data.shifts.map((s, i) => <td key={s.id} className="td font-bold">{matrix.reduce((t, m) => t + m.counts[i], 0)}</td>)}<td className="td font-bold">{inRange.length}</td></tr></Table></div>
        )}
        {tab === 'Rotation history' && (
          <div>
            <div className="border-b border-slate-200 p-4"><h3 className="mb-2 text-sm font-semibold">Rotation rules</h3>{data.rules.length === 0 ? <Empty /> : <Table head={['Rule', 'Department', 'Pattern', 'Start', 'Periods', 'Status', 'Next change', 'Last applied']}>{data.rules.map((r) => <tr key={r.id}><td className="td font-medium">{r.name}</td><td className="td">{dn(r.departmentId)}</td><td className="td capitalize">{r.type}</td><td className="td">{r.startDate}</td><td className="td">{r.periods}</td><td className="td"><Badge text={r.status} /></td><td className="td">{nextRotationDate(r) ?? '—'}</td><td className="td">{r.lastAppliedAt ? fmtDateTime(r.lastAppliedAt) : 'Never'}</td></tr>)}</Table>}</div>
            <div className="p-4"><h3 className="mb-2 text-sm font-semibold">Rotation events</h3>{rotLogs.length === 0 ? <Empty text="No rotation events yet." /> : <Table head={['Time', 'By', 'Action', 'Details']}>{rotLogs.map((l) => <tr key={l.id}><td className="td whitespace-nowrap">{fmtDateTime(l.createdAt)}</td><td className="td">{l.actor}</td><td className="td">{l.action}</td><td className="td">{l.details}</td></tr>)}</Table>}</div>
          </div>
        )}
        {tab === 'Activity log' && (logs.length === 0 ? <Empty text="No activity recorded." /> : <Table head={['Timestamp', 'User', 'Action', 'Entity', 'Details']}>{logs.slice(0, 200).map((l) => <tr key={l.id}><td className="td whitespace-nowrap">{fmtDateTime(l.createdAt)}</td><td className="td">{l.actor}</td><td className="td">{l.action}</td><td className="td">{l.entity}</td><td className="td">{l.details}</td></tr>)}</Table>)}
      </div>
    </div>
  );
}
