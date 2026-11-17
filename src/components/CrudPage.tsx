import { useMemo, useState, type ReactNode } from 'react';
import { api, errMsg, logActivity } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { useToast } from '../context/ToastContext';
import type { LogType } from '../lib/types';
import { Empty, ErrorBox, Field, Modal, PageHeader, Spinner, Table } from './ui';

export interface FieldDef {
  name: string; label: string; type: 'text' | 'email' | 'time' | 'number' | 'select' | 'color' | 'textarea';
  options?: { value: string | number; label: string }[]; required?: boolean; min?: number;
}
export interface Column<T> { header: string; render: (r: T) => ReactNode; sort?: (a: T, b: T) => number }
export interface FilterDef<T> { name: string; label: string; options: { value: string; label: string }[]; match: (r: T, v: string) => boolean }

interface Props<T extends { id: number }> {
  resource: string; title: string; noun: string; subtitle?: string;
  fields: FieldDef[]; columns: Column<T>[]; defaults: Record<string, unknown>;
  readOnly?: boolean; logType: LogType;
  searchText: (r: T) => string; filters?: FilterDef<T>[];
  label: (r: T) => string;
  validate?: (v: Record<string, any>, rows: T[], editing: T | null) => Record<string, string | undefined>;
  beforeDelete?: (r: T) => Promise<string | null>;
  afterCreate?: (created: T, values: Record<string, any>) => Promise<void>;
  afterDelete?: (r: T) => Promise<void>;
  extraData?: () => Promise<unknown>;
}

/** Generic list + create/edit/delete page backed by JSON Server, with search, filters, sorting and validation. */
export default function CrudPage<T extends { id: number }>(p: Props<T>) {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => api.list<T>(p.resource), [p.resource]);
  const [search, setSearch] = useState('');
  const [fv, setFv] = useState<Record<string, string>>({});
  const [sortIdx, setSortIdx] = useState(0);
  const [asc, setAsc] = useState(true);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<Record<string, any> | null>(null);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => {
    let r = (data ?? []).filter((x) => p.searchText(x).toLowerCase().includes(search.toLowerCase()));
    for (const f of p.filters ?? []) if (fv[f.name]) r = r.filter((x) => f.match(x, fv[f.name]));
    const col = p.columns[sortIdx];
    if (col?.sort) r = [...r].sort((a, b) => (asc ? 1 : -1) * col.sort!(a, b));
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, search, fv, sortIdx, asc]);

  const openForm = (row: T | null) => { setEditing(row); setForm(row ? { ...(row as any) } : { ...p.defaults }); setErrors({}); };

  const save = async () => {
    if (!form) return;
    const errs: Record<string, string | undefined> = {};
    for (const f of p.fields) {
      const v = form[f.name];
      if (f.required && (v === '' || v === undefined || v === null || (typeof v === 'string' && !v.trim()))) errs[f.name] = `${f.label} is required.`;
      else if (f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errs[f.name] = 'Enter a valid email address.';
      else if (f.type === 'number' && f.min !== undefined && Number(v) < f.min) errs[f.name] = `${f.label} must be at least ${f.min}.`;
    }
    Object.assign(errs, Object.keys(errs).length ? {} : p.validate?.(form, data ?? [], editing) ?? {});
    for (const k of Object.keys(errs)) if (!errs[k]) delete errs[k];
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const body = { ...form };
      for (const f of p.fields) if (f.type === 'number') body[f.name] = Number(body[f.name]);
      if (editing) {
        await api.update(p.resource, editing.id, body as Partial<T>);
        await logActivity(p.logType, `Updated ${p.noun}`, `${p.noun} #${editing.id}`, `${p.label({ ...editing, ...body } as T)} updated`);
        toast('success', `${p.noun} updated successfully.`);
      } else {
        const created = await api.create<T>(p.resource, body as Partial<T>);
        await p.afterCreate?.(created, body);
        await logActivity(p.logType, `Created ${p.noun}`, `${p.noun} #${created.id}`, `${p.label(created)} created`);
        toast('success', `${p.noun} created successfully.`);
      }
      setForm(null); reload();
    } catch (e) { toast('error', errMsg(e)); } finally { setSaving(false); }
  };

  const remove = async (r: T) => {
    try {
      const block = await p.beforeDelete?.(r);
      if (block) { toast('error', block); return; }
      if (!window.confirm(`Delete ${p.noun.toLowerCase()} "${p.label(r)}"? This cannot be undone.`)) return;
      await api.remove(p.resource, r.id);
      await p.afterDelete?.(r);
      await logActivity(p.logType, `Deleted ${p.noun}`, `${p.noun} #${r.id}`, `${p.label(r)} deleted`);
      toast('success', `${p.noun} deleted.`); reload();
    } catch (e) { toast('error', errMsg(e)); }
  };

  return (
    <div>
      <PageHeader title={p.title} subtitle={p.subtitle}>
        {!p.readOnly && <button className="btn-primary" onClick={() => openForm(null)}>+ Add {p.noun}</button>}
      </PageHeader>
      <div className="card">
        <div className="flex flex-wrap gap-2 border-b border-slate-200 p-3">
          <input className="input max-w-xs" placeholder={`Search ${p.noun.toLowerCase()}s…`} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
          {p.filters?.map((f) => (
            <select key={f.name} className="input w-auto" value={fv[f.name] ?? ''} onChange={(e) => setFv({ ...fv, [f.name]: e.target.value })} aria-label={f.label}>
              <option value="">All {f.label}</option>{f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ))}
          <select className="input w-auto" value={sortIdx} onChange={(e) => setSortIdx(Number(e.target.value))} aria-label="Sort by">
            {p.columns.map((c, i) => c.sort && <option key={i} value={i}>Sort: {c.header}</option>)}
          </select>
          <button className="btn-secondary" onClick={() => setAsc(!asc)} aria-label="Toggle sort direction">{asc ? '↑ Asc' : '↓ Desc'}</button>
        </div>
        {loading ? <Spinner /> : error ? <ErrorBox message={error} onRetry={reload} /> : rows.length === 0 ? <Empty text={`No ${p.noun.toLowerCase()}s found.`} /> : (
          <Table head={[...p.columns.map((c) => c.header), ...(p.readOnly ? [] : ['Actions'])]}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                {p.columns.map((c, i) => <td key={i} className="td">{c.render(r)}</td>)}
                {!p.readOnly && <td className="td whitespace-nowrap"><button className="btn-secondary btn-sm mr-1" onClick={() => openForm(r)}>Edit</button><button className="btn-danger btn-sm" onClick={() => remove(r)}>Delete</button></td>}
              </tr>
            ))}
          </Table>
        )}
      </div>
      {form && (
        <Modal title={`${editing ? 'Edit' : 'Add'} ${p.noun}`} onClose={() => setForm(null)}>
          <div className="space-y-3">
            {p.fields.map((f) => (
              <Field key={f.name} label={`${f.label}${f.required ? ' *' : ''}`} error={errors[f.name]}>
                {f.type === 'select' ? (
                  <select className={`input ${errors[f.name] ? 'input-error' : ''}`} value={form[f.name] ?? ''} onChange={(e) => setForm({ ...form, [f.name]: isNaN(Number(e.target.value)) || e.target.value === '' ? e.target.value : Number(e.target.value) })}>
                    <option value="">Select…</option>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === 'textarea' ? (
                  <textarea className="input" rows={3} value={form[f.name] ?? ''} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                ) : (
                  <input className={`input ${errors[f.name] ? 'input-error' : ''} ${f.type === 'color' ? 'h-10 p-1' : ''}`} type={f.type} min={f.min} value={form[f.name] ?? ''} onChange={(e) => setForm({ ...form, [f.name]: e.target.value })} />
                )}
              </Field>
            ))}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setForm(null)}>Cancel</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
