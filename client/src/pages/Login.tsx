import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth';
import type { Role } from '../types';

export default function Login() {
  const { user, login, register, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const mode = searchParams.get('mode') === 'register' ? 'register' : 'login';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('STUDENT');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from;

  if (!loading && user) {
    return <Navigate to={redirectTo ?? (user.role === 'INSTRUCTOR' ? '/dashboard' : '/my-learning')} replace />;
  }

  function switchMode(next: 'login' | 'register') {
    setError(null);
    setSearchParams(next === 'register' ? { mode: 'register' } : {});
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const signedInUser =
        mode === 'login'
          ? await login(email, password)
          : await register({ name, email, password, role });
      navigate(redirectTo ?? (signedInUser.role === 'INSTRUCTOR' ? '/dashboard' : '/my-learning'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function fillDemo(demoEmail: string, demoPassword: string) {
    setError(null);
    switchMode('login');
    setEmail(demoEmail);
    setPassword(demoPassword);
  }

  return (
    <div className="auth-page">
      <section className="auth-side">
        <span className="eyebrow">MiniLearn</span>
        <h1>Small courses. Real progress.</h1>
        <p>
          Browse lessons, mark them complete, pass the quiz and walk away with a certificate — all in one
          stripped-down LMS.
        </p>
        <ul className="auth-points">
          <li>Role-based access for students and instructors</li>
          <li>Progress tracking with an auto-graded quiz</li>
          <li>PDF certificate on completion</li>
          <li>Instructor dashboard with enrollment analytics</li>
        </ul>
      </section>

      <section className="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => switchMode('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => switchMode('register')}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <label className="field">
              <span>Full name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ada Lovelace"
                required
                minLength={2}
              />
            </label>
          )}

          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
              required
              minLength={6}
            />
          </label>

          {mode === 'register' && (
            <div className="field">
              <span>I am joining as</span>
              <div className="role-picker">
                <button
                  type="button"
                  className={role === 'STUDENT' ? 'selected' : ''}
                  onClick={() => setRole('STUDENT')}
                >
                  <strong>Student</strong>
                  <small>Enroll and learn</small>
                </button>
                <button
                  type="button"
                  className={role === 'INSTRUCTOR' ? 'selected' : ''}
                  onClick={() => setRole('INSTRUCTOR')}
                >
                  <strong>Instructor</strong>
                  <small>Create and teach</small>
                </button>
              </div>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="demo-accounts">
          <p>Demo accounts</p>
          <button type="button" className="demo-account" onClick={() => fillDemo('student@minilearn.dev', 'learn123')}>
            <span>Student</span>
            <code>student@minilearn.dev / learn123</code>
          </button>
          <button
            type="button"
            className="demo-account"
            onClick={() => fillDemo('instructor@minilearn.dev', 'teach123')}
          >
            <span>Instructor</span>
            <code>instructor@minilearn.dev / teach123</code>
          </button>
        </div>
      </section>
    </div>
  );
}
