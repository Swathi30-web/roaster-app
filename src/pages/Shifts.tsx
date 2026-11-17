import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import CrudPage from '../components/CrudPage';
import { Badge, ShiftChip } from '../components/ui';
import { fmtHours, isTime, shiftMinutes, isOvernight } from '../lib/utils';
import type { Assignment, RotationRule, Shift } from '../lib/types';

export default function Shifts() {
  const { user } = useAuth();
  return (
    <CrudPage<Shift>
      resource="shifts" title="Shift Management" subtitle="Define shift timings and breaks" noun="Shift"
      readOnly={user?.role !== 'admin'} logType="shift" label={(r) => r.name}
      defaults={{ name: '', startTime: '09:00', endTime: '17:00', breakMinutes: 30, color: '#6366f1', status: 'Active' }}
      searchText={(r) => r.name}
      fields={[
        { name: 'name', label: 'Shift name', type: 'text', required: true },
        { name: 'startTime', label: 'Start time', type: 'time', required: true },
        { name: 'endTime', label: 'End time', type: 'time', required: true },
        { name: 'breakMinutes', label: 'Break duration (minutes)', type: 'number', required: true, min: 0 },
        { name: 'color', label: 'Colour', type: 'color' },
        { name: 'status', label: 'Status', type: 'select', required: true, options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }] },
      ]}
      columns={[
        { header: 'Shift', render: (r) => <ShiftChip shift={r} small />, sort: (a, b) => a.name.localeCompare(b.name) },
        { header: 'Start', render: (r) => r.startTime, sort: (a, b) => a.startTime.localeCompare(b.startTime) },
        { header: 'End', render: (r) => <>{r.endTime}{isOvernight(r) && <span className="ml-1 text-xs text-slate-400">(+1 day)</span>}</> },
        { header: 'Break', render: (r) => `${r.breakMinutes} min` },
        { header: 'Working time', render: (r) => fmtHours(shiftMinutes(r) - r.breakMinutes) },
        { header: 'Status', render: (r) => <Badge text={r.status} /> },
      ]}
      filters={[{ name: 'status', label: 'Statuses', options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }], match: (r, v) => r.status === v }]}
      validate={(v, rows, ed) => {
        const e: Record<string, string> = {};
        if (!isTime(v.startTime)) e.startTime = 'Enter a valid time (HH:MM).';
        if (!isTime(v.endTime)) e.endTime = 'Enter a valid time (HH:MM).';
        if (!e.startTime && !e.endTime) {
          if (v.startTime === v.endTime) e.endTime = 'End time must differ from start time.';
          else if (Number(v.breakMinutes) >= shiftMinutes(v as Pick<Shift, "startTime" | "endTime">)) e.breakMinutes = 'Break must be shorter than the shift.';
        }
        if (rows.some((s) => s.id !== ed?.id && s.name.toLowerCase() === v.name.trim().toLowerCase())) e.name = 'A shift with this name already exists.';
        return e;
      }}
      beforeDelete={async (r) => {
        const [a, rr] = await Promise.all([api.list<Assignment>('assignments', { shiftId: r.id }), api.list<RotationRule>('rotationRules')]);
        if (a.length) return `Cannot delete: shift is used by ${a.length} assignment(s). Mark it Inactive instead.`;
        return rr.some((x) => x.shiftIds.includes(r.id)) ? 'Cannot delete: shift is used in a rotation rule.' : null;
      }}
    />
  );
}
