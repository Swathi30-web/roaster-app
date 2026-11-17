import axios from 'axios';
import type { ActivityLog, LogType } from './types';

export const http = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001', timeout: 8000 });

export const errMsg = (e: unknown): string => {
  if (axios.isAxiosError(e)) {
    if (!e.response) return 'Cannot reach the server. Make sure JSON Server is running (npm run api).';
    return `Request failed (${e.response.status}).`;
  }
  return e instanceof Error ? e.message : 'Something went wrong.';
};

export const api = {
  list: <T,>(resource: string, params?: Record<string, unknown>) => http.get<T[]>(`/${resource}`, { params }).then((r) => r.data),
  get: <T,>(resource: string, id: number) => http.get<T>(`/${resource}/${id}`).then((r) => r.data),
  create: <T,>(resource: string, body: Omit<T, 'id'> | Partial<T>) => http.post<T>(`/${resource}`, body).then((r) => r.data),
  update: <T,>(resource: string, id: number, body: Partial<T>) => http.patch<T>(`/${resource}/${id}`, body).then((r) => r.data),
  remove: (resource: string, id: number) => http.delete(`/${resource}/${id}`).then(() => undefined),
};

let actor = 'System';
export const setActor = (name: string) => { actor = name; };

export const logActivity = (type: LogType, action: string, entity: string, details: string) =>
  api.create<ActivityLog>('activityLogs', { type, action, entity, details, actor, createdAt: new Date().toISOString() }).catch(() => undefined);

export const notify = (userId: number | undefined, message: string, type: 'assignment' | 'rotation' | 'info') =>
  userId === undefined ? Promise.resolve() :
  api.create('notifications', { userId, message, type, read: false, createdAt: new Date().toISOString() }).catch(() => undefined);
