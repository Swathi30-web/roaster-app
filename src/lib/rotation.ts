import { api } from './api';
import type { Assignment, Employee, RotationRule, Shift } from './types';
import { findConflict, periodDates } from './utils';

export interface RotationPlan { toCreate: Omit<Assignment, 'id'>[]; skipped: string[] }

/** Builds the assignments a rotation rule would generate. Employees are offset by their position in the rule's sequence. */
export function buildRotation(rule: RotationRule, employees: Employee[], shifts: Shift[], existing: Assignment[], actor: string): RotationPlan {
  const team = employees.filter((e) => e.departmentId === rule.departmentId && e.status === 'Active').sort((a, b) => a.id - b.id);
  const pool = [...existing];
  const toCreate: Omit<Assignment, 'id'>[] = [];
  const skipped: string[] = [];
  for (let k = 0; k < rule.periods; k++) {
    team.forEach((emp, idx) => {
      const shiftId = rule.shiftIds[(idx + k) % rule.shiftIds.length];
      for (const date of periodDates(rule, k)) {
        const conflict = findConflict(emp.id, shiftId, date, pool, shifts);
        if (conflict) { skipped.push(`${emp.name} – ${date}: ${conflict}`); continue; }
        const a = { employeeId: emp.id, shiftId, date, status: 'Scheduled' as const, createdBy: actor, rotationRuleId: rule.id };
        toCreate.push(a);
        pool.push({ ...a, id: -pool.length - 1 });
      }
    });
  }
  return { toCreate, skipped };
}

export async function createInChunks(items: Omit<Assignment, 'id'>[], size = 20) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map((a) => api.create<Assignment>('assignments', a)));
  }
}
