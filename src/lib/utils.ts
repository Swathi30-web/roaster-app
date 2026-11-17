import type { Assignment, RotationRule, Shift } from './types';

const pad = (n: number) => String(n).padStart(2, '0');
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseYmd = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayStr = () => ymd(new Date());
export const addDays = (s: string, n: number) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
export const startOfWeek = (s: string) => { const d = parseYmd(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return ymd(d); };
export const dayNumber = (s: string) => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); };
export const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && ymd(parseYmd(s)) === s;
export const fmtDate = (s: string) => parseYmd(s).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export const isTime = (t: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);

/** Shift length in minutes (handles overnight shifts where end <= start). */
export const shiftMinutes = (s: Pick<Shift, 'startTime' | 'endTime'>) => {
  const d = toMin(s.endTime) - toMin(s.startTime);
  return d > 0 ? d : d + 1440;
};
export const fmtHours = (m: number) => `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}`;
export const isOvernight = (s: Pick<Shift, 'startTime' | 'endTime'>) => toMin(s.endTime) <= toMin(s.startTime);

/** Absolute [start, end) interval in minutes for a shift on a given date. */
export const interval = (s: Shift, date: string): [number, number] => {
  const start = dayNumber(date) * 1440 + toMin(s.startTime);
  return [start, start + shiftMinutes(s)];
};

/** Returns an error message if the assignment is a duplicate or overlaps another; otherwise null. */
export function findConflict(employeeId: number, shiftId: number, date: string, existing: Assignment[], shifts: Shift[], ignoreId?: number): string | null {
  const shift = shifts.find((s) => s.id === shiftId);
  if (!shift) return 'Selected shift does not exist.';
  const [s1, e1] = interval(shift, date);
  for (const a of existing) {
    if (a.employeeId !== employeeId || a.id === ignoreId || a.status === 'Cancelled') continue;
    if (a.date === date) return `Duplicate assignment: this employee already has a shift on ${date}.`;
    const other = shifts.find((s) => s.id === a.shiftId);
    if (!other) continue;
    const [s2, e2] = interval(other, a.date);
    if (s1 < e2 && s2 < e1) return `Overlaps with ${other.name} shift (${other.startTime}–${other.endTime}) on ${a.date}.`;
  }
  return null;
}

/** Weekdays (Mon–Fri) covered by rotation period k, never earlier than the rule's start date. */
export function periodDates(rule: Pick<RotationRule, 'type' | 'startDate'>, k: number): string[] {
  const out: string[] = [];
  if (rule.type === 'weekly') {
    const ws = addDays(startOfWeek(rule.startDate), 7 * k);
    for (let i = 0; i < 5; i++) out.push(addDays(ws, i));
  } else {
    const s = parseYmd(rule.startDate);
    const first = new Date(s.getFullYear(), s.getMonth() + k, 1);
    const last = new Date(s.getFullYear(), s.getMonth() + k + 1, 0).getDate();
    for (let i = 1; i <= last; i++) {
      const d = new Date(first.getFullYear(), first.getMonth(), i);
      if (d.getDay() !== 0 && d.getDay() !== 6) out.push(ymd(d));
    }
  }
  return out.filter((d) => d >= rule.startDate);
}

/** Start date of the next rotation change (period boundary) on/after today, or null once the rule has ended. */
export function nextRotationDate(rule: RotationRule, today = todayStr()): string | null {
  for (let k = 0; k < rule.periods; k++) {
    const dates = periodDates(rule, k);
    if (dates.length && dates[0] >= today) return dates[0];
  }
  return null;
}

export const downloadCsv = (filename: string, rows: (string | number)[][]) => {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
};
