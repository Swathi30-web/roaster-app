import { useState } from 'react';
import { api, errMsg, logActivity, notify } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { buildRotation, createInChunks, type RotationPlan } from '../lib/rotation';
import { Badge, Empty, ErrorBox, Field, Modal, PageHeader, ShiftChip, Spinner } from '../components/ui';
import type { ActivityLog, Assignment, Department, Employee, RotationRule, Shift, User } from '../lib/types';
import { fmtDate, fmtDateTime, isValidDate, nextRotationDate } from '../lib/utils';

const blank = (): Partial<RotationRule> => ({ name: '', type: 'weekly', departmentId: undefined, shiftIds: [], startDate: '', periods: 4, status: 'Active' });

export default function Rotations() {
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const [rules, depts, shifts, employees, assignments, users, logs] = await Promise.all([
      api.list<RotationRule>('rotationRules'), api.list<Department>('departments'), api.list<Shift>('shifts'),
      api.list<Employee>('employees'), api.list<Assignment>('assignments'), api.list<User>('users'),
      api.list<ActivityLog>('activityLogs', { type: 'rotation', _sort: 'createdAt', _order: 'desc' }),
    ]);
    return { rules, depts, shifts, employees, assignments, users, logs };
  });
  const [form, setForm] = useState<Partial<RotationRule> | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<{ rule: RotationRule; plan: RotationPlan } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form || !data) return;
    const e: Record<string, string> = {};
    if (!form.name?.trim()) e.name = 'Rule name is required.';
    if (!form.departmentId) e.departmentId = 'Select a department.';
    if ((form.shiftIds?.length ?? 0) < 2) e.shiftIds = 'Select at least two shifts for the rotation sequence.';
    if (!form.startDate || !isValidDate(form.startDate)) e.startDate = 'Enter a valid start date.';
    if (!form.periods || form.periods < 1 || form.periods > 12) e.periods = 'Periods must be between 1 and 12.';
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const body = { ...form, name: form.name!.trim() };
      if (form.id) { await api.update('rotationRules', form.id, body); await logActivity('rotation', 'Updated rotation rule', `RotationRule #${form.id}`, `${body.name} updated`); }
      else { const c = await api.create<RotationRule>('rotationRules', body); await logActivity('rotation', 'Created rotation rule', `RotationRule #${c.id}`, `${body.name} (${body.type}) created`); }
      toast('success', 'Rotation rule saved.'); setForm(null); reload();
    } catch (x) { toast('error', errMsg(x)); } finally { setBusy(false); }
  };

  const toggle = async (r: RotationRule) => {
    const status = r.status === 'Active' ? 'Paused' : 'Active';
    try { await api.update('rotationRules', r.id, { status }); await logActivity('rotation', `Rotation rule ${status === 'Active' ? 'activated' : 'paused'}`, `RotationRule #${r.id}`, r.name); toast('success', `Rule ${status === 'Active' ? 'activated' : 'paused'}.`); reload(); }
    catch (x) { toast('error', errMsg(x)); }
  };
  const remove = async (r: RotationRule) => {
    if (!window.confirm(`Delete rotation rule "${r.name}"? Generated assignments are kept.`)) return;
    try { await api.remove('rotationRules', r.id); await logActivity('rotation', 'Deleted rotation rule', `RotationRule #${r.id}`, r.name); toast('success', 'Rule deleted.'); reload(); }
    catch (x) { toast('error', errMsg(x)); }
  };
  const openPreview = (rule: RotationRule) => {
    if (!data) return;
    if (rule.status !== 'Active') return toast('error', 'Activate the rule before applying it.');
    setPreview({ rule, plan: buildRotation(rule, data.employees, data.shifts, data.assignments, user?.name ?? 'System') });
  };
  const apply = async () => {
    if (!preview || !data) return;
    const { rule, plan } = preview;
    setBusy(true);
    try {
      await createInChunks(plan.toCreate);
      await api.update('rotationRules', rule.id, { lastAppliedAt: new Date().toISOString() });
      await logActivity('rotation', 'Applied rotation', `RotationRule #${rule.id}`, `${rule.name}: ${plan.toCreate.length} assignment(s) created, ${plan.skipped.length} skipped`);
      const team = data.employees.filter((e) => e.departmentId === rule.departmentId && e.status === 'Active');
      await Promise.all(team.map((e) => notify(data.users.find((u) => u.employeeId === e.id)?.id, `Upcoming rotation "${rule.name}" starts ${rule.startDate}. Check your schedule.`, 'rotation')));
      toast('success', `Rotation applied: ${plan.toCreate.length} assignment(s) created.`); setPreview(null); reload();
    } catch (x) { toast('error', errMsg(x)); } finally { setBusy(false); }
  };

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox message={error} onRetry={reload} />;
  const dn = (id?: number) => data.depts.find((d) => d.id === id)?.name ?? '—';
  const sh = (id: number) => data.shifts.find((s) => s.id === id);

  return (
    <div>
      <PageHeader title="Rotation Rules" subtitle="Configure weekly or monthly shift rotation patterns">
        <button className="btn-primary" onClick={() => { setErrs({}); setForm(blank()); }}>+ New Rotation Rule</button>
      </PageHeader>
      {data.rules.length === 0 ? <div className="card"><Empty text="No rotation rules yet." /></div> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.rules.map((r) => {
            const next = nextRotationDate(r);
            return (
              <div key={r.id} className="card space-y-3 p-4">
                <div className="flex items-start justify-between gap-2"><div><h3 className="font-semibold text-slate-800">{r.name}</h3><p className="text-xs text-slate-500">{dn(r.departmentId)} · {r.type} · {r.periods} period(s) from {fmtDate(r.startDate)}</p></div><Badge text={r.status} /></div>
                <div className="flex flex-wrap items-center gap-1 text-xs">Sequence: {r.shiftIds.map((id, i) => <span key={i} className="flex items-center gap-1">{i > 0 && '→'}<ShiftChip shift={sh(id)} small /></span>)}</div>
                <div className="text-xs text-slate-500">Next rotation change: <b>{next ? fmtDate(next) : 'Completed'}</b> · {r.lastAppliedAt ? `Last applied ${fmtDateTime(r.lastAppliedAt)}` : 'Not applied yet'}</div>
                <div className="flex flex-wrap gap-2">
                  <button className="btn-primary btn-sm" onClick={() => openPreview(r)}>Apply rotation</button>
                  <button className="btn-secondary btn-sm" onClick={() => { setErrs({}); setForm({ ...r }); }}>Edit</button>
                  <button className="btn-secondary btn-sm" onClick={() => toggle(r)}>{r.status === 'Active' ? 'Pause' : 'Activate'}</button>
                  <button className="btn-danger btn-sm" onClick={() => remove(r)}>Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <h2 className="mb-2 mt-8 text-lg font-semibold text-slate-800">Rotation history</h2>
      <div className="card divide-y divide-slate-100">
        {data.logs.length === 0 ? <Empty text="No rotation activity yet." /> : data.logs.slice(0, 10).map((l) => (
          <div key={l.id} className="flex flex-wrap justify-between gap-2 px-4 py-2 text-sm"><span><b>{l.action}</b> — {l.details}</span><span className="text-xs text-slate-400">{l.actor} · {fmtDateTime(l.createdAt)}</span></div>
        ))}
      </div>

      {form && (
        <Modal title={form.id ? 'Edit Rotation Rule' : 'New Rotation Rule'} onClose={() => setForm(null)} wide>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Rule name *" error={errs.name}><input className="input" value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Department *" error={errs.departmentId}><select className="input" value={form.departmentId ?? ''} onChange={(e) => setForm({ ...form, departmentId: Number(e.target.value) || undefined })}><option value="">Select…</option>{data.depts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
            <Field label="Pattern *"><select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'weekly' | 'monthly' })}><option value="weekly">Weekly (shift changes every week)</option><option value="monthly">Monthly (shift changes every month)</option></select></Field>
            <Field label="Status"><select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'Active' | 'Paused' })}><option>Active</option><option>Paused</option></select></Field>
            <Field label="Start date *" error={errs.startDate}><input type="date" className="input" value={form.startDate ?? ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label={`Number of ${form.type === 'monthly' ? 'months' : 'weeks'} *`} error={errs.periods}><input type="number" min={1} max={12} className="input" value={form.periods ?? ''} onChange={(e) => setForm({ ...form, periods: Number(e.target.value) })} /></Field>
          </div>
          <div className="mt-3"><Field label="Shift sequence * (click shifts in rotation order)" error={errs.shiftIds}>
            <div className="flex flex-wrap gap-2">{data.shifts.filter((s) => s.status === 'Active').map((s) => {
              const idx = form.shiftIds?.indexOf(s.id) ?? -1;
              return <button type="button" key={s.id} onClick={() => setForm({ ...form, shiftIds: idx >= 0 ? form.shiftIds!.filter((x) => x !== s.id) : [...(form.shiftIds ?? []), s.id] })} className={`rounded-lg border px-3 py-1 text-sm ${idx >= 0 ? 'border-brand-600 bg-brand-50' : 'border-slate-300'}`}>{idx >= 0 && <b className="mr-1">{idx + 1}.</b>}{s.name}</button>;
            })}</div></Field></div>
          <p className="mt-3 text-xs text-slate-500">Employees in the department start at different points in the sequence and move one step forward each period. Weekdays (Mon–Fri) are scheduled.</p>
          <div className="mt-5 flex justify-end gap-2"><button className="btn-secondary" onClick={() => setForm(null)}>Cancel</button><button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save rule'}</button></div>
        </Modal>
      )}
      {preview && (
        <Modal title={`Apply: ${preview.rule.name}`} onClose={() => setPreview(null)} wide>
          <p className="text-sm text-slate-700"><b>{preview.plan.toCreate.length}</b> assignment(s) will be created for {dn(preview.rule.departmentId)}. <b>{preview.plan.skipped.length}</b> will be skipped due to duplicates/overlaps.</p>
          {preview.plan.skipped.length > 0 && <ul className="mt-3 max-h-40 list-disc space-y-1 overflow-y-auto rounded-lg bg-amber-50 p-3 pl-6 text-xs text-amber-800">{preview.plan.skipped.slice(0, 30).map((s, i) => <li key={i}>{s}</li>)}</ul>}
          <div className="mt-5 flex justify-end gap-2"><button className="btn-secondary" onClick={() => setPreview(null)}>Cancel</button><button className="btn-primary" disabled={busy || preview.plan.toCreate.length === 0} onClick={apply}>{busy ? 'Applying…' : 'Confirm & apply'}</button></div>
        </Modal>
      )}
    </div>
  );
}
