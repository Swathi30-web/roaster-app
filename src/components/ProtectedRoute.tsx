import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../lib/types';

export const homeFor = (role: Role) => (role === 'employee' ? '/my-schedule' : '/dashboard');

export default function ProtectedRoute({ roles }: { roles?: Role[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
