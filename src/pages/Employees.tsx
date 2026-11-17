import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { useAuth } from '../context/AuthContext';
import CrudPage from '../components/CrudPage';
import { Badge, Spinner } from '../components/ui';
import type { Assignment, Department, Employee, User } from '../lib/types';

export default function Employees() {
  const { user } = useAuth();
  const { data: depts, loading } = useAsync(() => api.list<Department>('departments'));
  if (loading || !depts) return <Spinner />;
  const dn = (id: number) => depts.find((d) => d.id === id)?.name ?? '—';
  const opts = depts.map((d) => ({ value: d.id, label: d.name }));
  return (
    <CrudPage<Employee>
      resource="employees" title="Employee Management" subtitle={user?.role === 'admin' ? 'Create, edit and remove employee records' : 'View employee records (admin can edit)'} noun="Employee"
      readOnly={user?.role !== 'admin'} logType="employee" label={(r) => r.name}
      defaults={{ name: '', email: '', departmentId: '', designation: '', status: 'Active' }}
      searchText={(r) => `${r.name} ${r.email} ${r.designation}`}
      fields={[
        { name: 'name', label: 'Full name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'departmentId', label: 'Department', type: 'select', required: true, options: opts },
        { name: 'designation', label: 'Designation', type: 'text', required: true },
        { name: 'status', label: 'Status', type: 'select', required: true, options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }] },
      ]}
      columns={[
        { header: 'Name', render: (r) => <b>{r.name}</b>, sort: (a, b) => a.name.localeCompare(b.name) },
        { header: 'Email', render: (r) => r.email },
        { header: 'Department', render: (r) => dn(r.departmentId), sort: (a, b) => dn(a.departmentId).localeCompare(dn(b.departmentId)) },
        { header: 'Designation', render: (r) => r.designation },
        { header: 'Status', render: (r) => <Badge text={r.status} /> },
      ]}
      filters={[
        { name: 'dept', label: 'Departments', options: opts.map((o) => ({ value: String(o.value), label: o.label })), match: (r, v) => String(r.departmentId) === v },
        { name: 'status', label: 'Statuses', options: [{ value: 'Active', label: 'Active' }, { value: 'Inactive', label: 'Inactive' }], match: (r, v) => r.status === v },
      ]}
      validate={(v, rows, ed) => rows.some((e) => e.id !== ed?.id && e.email.toLowerCase() === v.email.trim().toLowerCase()) ? { email: 'An employee with this email already exists.' } : {}}
      beforeDelete={async (r) => {
        const a = await api.list<Assignment>('assignments', { employeeId: r.id });
        return a.length ? `Cannot delete: ${r.name} has ${a.length} assignment(s). Mark the employee Inactive instead.` : null;
      }}
      afterCreate={async (c, v) => { // give every new employee a login so they can view their own schedule
        await api.create<User>('users', { name: v.name, email: String(v.email).toLowerCase(), password: 'password123', role: 'employee', employeeId: c.id });
      }}
      afterDelete={async (r) => { const u = await api.list<User>('users', { employeeId: r.id }); await Promise.all(u.map((x) => api.remove('users', x.id))); }}
    />
  );
}
