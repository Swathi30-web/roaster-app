import { useMemo, useState } from 'react';
import { api, errMsg, logActivity, notify } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge, Empty, ErrorBox, Field, Modal, PageHeader, ShiftChip, Spinner, Table } from '../components/ui';
import { ASSIGNMENT_STATUSES, type Assignment, type AssignmentStatus, type Department, type Employee, type Shift, type User } from '../lib/types';
import { findConflict, fmtDate, isValidDate, todayStr } from '../lib/utils';

export default function Assignments() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const [assignments, employees, shifts, departments, users] = await Promise.all([
      api.list<Assignment>('assignments'), api.list<Employee>('employees'), api.list<Shift>('shifts'),
      api.list<Department>('departments'), api.list<User>('users'),
    ]);
    return { assignments, employees, shifts, departments, users };
  });
  const [f, setF] = useState({ q: '', employee: '', dept: '', shift: '', date: '', status: '' });
  const [sort, setSort] = useState<'date' | 'name'>('date');
  const [asc, setAsc] = useState(true);
  const [edit, setEdit] = useState<Partial<Assignment> | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const emp = (id: number) => data?.employees.find((e) => e.id === id);
  const rows = useMemo(() => {
    if (!data) return [];
    let r = data.assignments.filter((a) => {
      const e = emp(a.employeeId);
      return (!f.employee || String(a.employeeId) === f.employee) && (!f.dept || String(e?.departmentId) === f.dept) &&
        (!f.shift || String(a.shiftId) === f.shift) && (!f.date || a.date === f.date) && (!f.status || a.status === f.status) &&
        (!f.q || (e?.name ?? '').toLowerCase().includes(f.q.toLowerCase()));
    });
    r = [...r].sort((a, b) => (sort === 'date' ? a.date.localeCompare(b.date) || (emp(a.employeeId)?.name ?? '').localeCompare(emp(b.employeeId)?.name ?? '') : (emp(a.employeeId)?.name ?? '').localeCompare(emp(b.employeeId)?.name ?? '') || a.date.localeCompare(b.date)));
    return asc ? r : r.reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, f, sort, asc]);

  const save = async () => {
    if (!data || !edit) return;
    if (!edit.employeeId || !edit.shiftId || !edit.date) return setErr('Employee, shift and date are required.');
    if (!isValidDate(edit.date)) return setErr('Enter a valid date.');
    if (!edit.id && edit.date < todayStr()) return setErr('New assignments cannot be created for past dates.');
    const e = emp(edit.employeeId);
    if (e?.status !== 'Active') return setErr('Inactive employees cannot be assigned to shifts.');
    const conflict = findConflict(edit.employeeId, edit.shiftId, edit.date, data.assignments, data.shifts, edit.id);
    if (conflict) return setErr(conflict);
    setBusy(true); setErr('');
    try {
      const shift = data.shifts.find((s) => s.id === edit.shiftId)!;
      const target = data.users.find((u) => u.employeeId === edit.employeeId)?.id;
      if (edit.id) {
        await api.update('assignments', edit.id, { employeeId: edit.employeeId, shiftId: edit.shiftId, date: edit.date });
        await logActivity('assignment', 'Updated assignment', `Assignment #${edit.id}`, `${e?.name} → ${shift.name} on ${edit.date}`);
        await notify(target, `Your assignment was updated: ${shift.name} (${shift.startTime}–${shift.endTime}) on ${edit.date}.`, 'assignment');
        toast('success', 'Assignment updated.');
      } else {
        const c = await api.create<Assignment>('assignments', { employeeId: edit.employeeId, shiftId: edit.shiftId, date: edit.date, status: 'Scheduled', createdBy: user?.name });
        await logActivity('assignment', 'Created assignment', `Assignment #${c.id}`, `${e?.name} → ${shift.name} on ${edit.date}`);
        await notify(target, `New assignment: ${shift.name} (${shift.startTime}–${shift.endTime}) on ${edit.date}.`, 'assignment');
        toast('success', 'Shift assigned successfully.');
      }
      setEdit(null); reload();
    } catch (x) { setErr(errMsg(x)); } finally { setBusy(false); }
  };

  const setStatus = async (a: Assignment, status: AssignmentStatus) => {
    try {
      await api.update('assignments', a.id, { status });
      await logActivity('status', 'Status changed', `Assignment #${a.id}`, `${emp(a.employeeId)?.name} on ${a.date}: ${a.status} → ${status}`);
      toast('success', `Status set to ${status}.`); reload();
    } catch (x) { toast('error', errMsg(x)); }
  };
  const remove = async (a: Assignment) => {
    if (!window.confirm('Delete this assignment?')) return;
    try {
      await api.remove('assignments', a.id);
      await logActivity('assignment', 'Deleted assignment', `Assignment #${a.id}`, `${emp(a.employeeId)?.name} on ${a.date} removed`);
      toast('success', 'Assignment deleted.'); reload();
    } catch (x) { toast('error', errMsg(x)); }
  };

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error} onRetry={reload} />;
  const activeEmps = data.employees.filter((e) => e.status === 'Active');
  const sel = (k: keyof typeof f, label: string, opts: { value: string | number; label: string }[]) => (
    <select className="input w-auto" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} aria-label={label}>
      <option value="">All {label}</option>{opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );

  return (
    <div>
      <PageHeader title="Shift Assignment" subtitle="Assign employees to shifts and track status">
        <button className="btn-primary" onClick={() => { setErr(''); setEdit({ date: todayStr() }); }}>+ Assign Shift</button>
      </PageHeader>
      <div className="card">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">
          <input className="input max-w-[12rem]" placeholder="Search employee…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
          {sel('employee', 'Employees', data.employees.map((e) => ({ value: e.id, label: e.name })))}
          {sel('dept', 'Departments', data.departments.map((d) => ({ value: d.id, label: d.name })))}
          {sel('shift', 'Shifts', data.shifts.map((s) => ({ value: s.id, label: s.name })))}
          {sel('status', 'Statuses', ASSIGNMENT_STATUSES.map((s) => ({ value: s, label: s })))}
          <input type="date" className="input w-auto" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} aria-label="Date" />
          <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value as 'date' | 'name')} aria-label="Sort"><option value="date">Sort: Date</option><option value="name">Sort: Employee name</option></select>
          <button className="btn-secondary" onClick={() => setAsc(!asc)}>{asc ? '↑ Asc' : '↓ Desc'}</button>
          <button className="btn-secondary" onClick={() => setF({ q: '', employee: '', dept: '', shift: '', date: '', status: '' })}>Clear</button>
        </div>
        {rows.length === 0 ? <Empty text="No assignments match your filters." /> : (
          <Table head={['Date', 'Employee', 'Department', 'Shift', 'Status', 'Actions']}>
            {rows.map((a) => {
              const e = emp(a.employeeId);
              return (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="td whitespace-nowrap">{fmtDate(a.date)}</td>
                  <td className="td font-medium">{e?.name ?? 'Unknown'}</td>
                  <td className="td">{data.departments.find((d) => d.id === e?.departmentId)?.name}</td>
                  <td className="td"><ShiftChip shift={data.shifts.find((s) => s.id === a.shiftId)} /></td>
                  <td className="td"><div className="flex items-center gap-2"><Badge text={a.status} />
                    <select className="input w-auto py-1 text-xs" value={a.status} onChange={(ev) => setStatus(a, ev.target.value as AssignmentStatus)} aria-label="Change status">{ASSIGNMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div></td>
                  <td className="td whitespace-nowrap"><button className="btn-secondary btn-sm mr-1" onClick={() => { setErr(''); setEdit(a); }}>Edit</button><button className="btn-danger btn-sm" onClick={() => remove(a)}>Delete</button></td>
                </tr>
              );
            })}
          </Table>
        )}
      </div>
      {edit && (
        <Modal title={edit.id ? 'Update Assignment' : 'Assign Shift'} onClose={() => setEdit(null)}>
          <div className="space-y-3">
            {err && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{err}</div>}
            <Field label="Employee *"><select className="input" value={edit.employeeId ?? ''} onChange={(e) => setEdit({ ...edit, employeeId: Number(e.target.value) || undefined })}><option value="">Select employee…</option>{activeEmps.map((e) => <option key={e.id} value={e.id}>{e.name} — {data.departments.find((d) => d.id === e.departmentId)?.name}</option>)}</select></Field>
            <Field label="Shift *"><select className="input" value={edit.shiftId ?? ''} onChange={(e) => setEdit({ ...edit, shiftId: Number(e.target.value) || undefined })}><option value="">Select shift…</option>{data.shifts.filter((s) => s.status === 'Active' || s.id === edit.shiftId).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>)}</select></Field>
            <Field label="Date *"><input type="date" className="input" value={edit.date ?? ''} onChange={(e) => setEdit({ ...edit, date: e.target.value })} /></Field>
          </div>
          <div className="mt-5 flex justify-end gap-2"><button className="btn-secondary" onClick={() => setEdit(null)}>Cancel</button><button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></div>
        </Modal>
      )}
    </div>
  );
}
