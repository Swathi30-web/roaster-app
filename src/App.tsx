import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute, { homeFor } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Departments from './pages/Departments';
import Shifts from './pages/Shifts';
import Assignments from './pages/Assignments';
import Rotations from './pages/Rotations';
import Roster from './pages/Roster';
import MySchedule from './pages/MySchedule';
import Notifications from './pages/Notifications';
import Reports from './pages/Reports';

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={homeFor(user.role)} replace /> : <Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/notifications" element={<Notifications />} />
          <Route element={<ProtectedRoute roles={['employee']} />}><Route path="/my-schedule" element={<MySchedule />} /></Route>
          <Route element={<ProtectedRoute roles={['admin', 'manager']} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/departments" element={<Departments />} />
            <Route path="/shifts" element={<Shifts />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/rotations" element={<Rotations />} />
            <Route path="/roster" element={<Roster />} />
            <Route path="/reports" element={<Reports />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={user ? homeFor(user.role) : '/login'} replace />} />
    </Routes>
  );
}
