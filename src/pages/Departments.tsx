import { api } from '../lib/api';
import { useAsync } from '../lib/hooks';
import { useAuth } from '../context/AuthContext';
import CrudPage from '../components/CrudPage';
import type { Department, Employee } from '../lib/types';

export default function Departments() {
  const { user } = useAuth();
  const { data: emps } = useAsync(() => api.list<Employee>('employees'));
  const count = (id: number) => (emps ?? []).filter((e) => e.departmentId === id).length;
  return (
    <CrudPage<Department>
      resource="departments" title="Department Management" subtitle="Organise employees into departments" noun="Department"
      readOnly={user?.role !== 'admin'} logType="department" label={(r) => r.name} defaults={{ name: '', description: '' }}
      searchText={(r) => `${r.name} ${r.description ?? ''}`}
      fields={[{ name: 'name', label: 'Department name', type: 'text', required: true }, { name: 'description', label: 'Description', type: 'textarea' }]}
      columns={[
        { header: 'Name', render: (r) => <b>{r.name}</b>, sort: (a, b) => a.name.localeCompare(b.name) },
        { header: 'Description', render: (r) => r.description || '—' },
        { header: 'Employees', render: (r) => count(r.id), sort: (a, b) => count(a.id) - count(b.id) },
      ]}
      validate={(v, rows, ed) => rows.some((d) => d.id !== ed?.id && d.name.toLowerCase() === v.name.trim().toLowerCase()) ? { name: 'A department with this name already exists.' } : {}}
      beforeDelete={async (r) => (count(r.id) ? `Cannot delete: ${count(r.id)} employee(s) belong to this department.` : null)}
    />
  );
}
