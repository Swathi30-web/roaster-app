export type Role = 'admin' | 'manager' | 'employee';
export interface User { id: number; name: string; email: string; password?: string; role: Role; employeeId?: number }
export interface Department { id: number; name: string; description?: string }
export interface Employee { id: number; name: string; email: string; departmentId: number; designation: string; status: 'Active' | 'Inactive' }
export interface Shift { id: number; name: string; startTime: string; endTime: string; breakMinutes: number; color: string; status: 'Active' | 'Inactive' }
export const ASSIGNMENT_STATUSES = ['Scheduled', 'Confirmed', 'Completed', 'Missed', 'Cancelled'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];
export interface Assignment { id: number; employeeId: number; shiftId: number; date: string; status: AssignmentStatus; createdBy?: string; rotationRuleId?: number }
export interface RotationRule {
  id: number; name: string; type: 'weekly' | 'monthly'; departmentId: number; shiftIds: number[];
  startDate: string; periods: number; status: 'Active' | 'Paused'; lastAppliedAt?: string;
}
export interface AppNotification { id: number; userId: number; message: string; type: 'assignment' | 'rotation' | 'info'; read: boolean; createdAt: string }
export type LogType = 'assignment' | 'rotation' | 'employee' | 'shift' | 'department' | 'status' | 'auth';
export interface ActivityLog { id: number; action: string; entity: string; details: string; actor: string; type: LogType; createdAt: string }
