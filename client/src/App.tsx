import { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Nav from './components/Nav';
import { useAuth } from './auth';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import MyLearning from './pages/MyLearning';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';

function ProtectedRoute({ children, roles }: { children: ReactNode; roles?: Array<'STUDENT' | 'INSTRUCTOR'> }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="page-loader">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;

  return <>{children}</>;
}

export default function App() {
  return (
    <div className="app-shell">
      <Nav />
      <main className="page">
        <Routes>
          <Route path="/" element={<Courses />} />
          <Route path="/login" element={<Login />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route
            path="/my-learning"
            element={
              <ProtectedRoute roles={['STUDENT']}>
                <MyLearning />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['INSTRUCTOR']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer">
        <span>MiniLearn — a 4-hour mini LMS demo.</span>
        <span>Videos courtesy of the Blender Foundation sample library.</span>
      </footer>
    </div>
  );
}
