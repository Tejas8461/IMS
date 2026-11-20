import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export default function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <header className="nav">
      <div className="nav-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">M</span>
          <span>
            MiniLearn
            <small>mini LMS</small>
          </span>
        </Link>

        <nav className="nav-links">
          <NavLink to="/" end>
            Courses
          </NavLink>
          {user?.role === 'STUDENT' && <NavLink to="/my-learning">My learning</NavLink>}
          {user?.role === 'INSTRUCTOR' && <NavLink to="/dashboard">Dashboard</NavLink>}
        </nav>

        <div className="nav-user">
          {user ? (
            <>
              <div className="user-chip">
                <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
                <span className="user-meta">
                  <strong>{user.name.split(' ')[0]}</strong>
                  <small>{user.role === 'INSTRUCTOR' ? 'Instructor' : 'Student'}{user.isAdmin ? ' · admin' : ''}</small>
                </span>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
              <Link to="/login?mode=register" className="btn btn-primary btn-sm">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
