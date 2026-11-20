import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Chart } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { DashboardData } from '../types';
import { formatCurrency, formatDate, formatPrice } from '../utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Tooltip, Legend);

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('999');
  const [liveClassAt, setLiveClassAt] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await api<DashboardData>('/instructor/dashboard');
      setData(response);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await api('/courses', {
        method: 'POST',
        body: {
          title,
          description,
          price: Number(price) || 0,
          liveClassAt: liveClassAt ? new Date(liveClassAt).toISOString() : null,
        },
      });
      setTitle('');
      setDescription('');
      setPrice('999');
      setLiveClassAt('');
      setNotice('Course created. Open it below to add lessons and a quiz.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the course.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="page-loader">Loading dashboard…</div>;

  const chart = data?.chart ?? [];
  const totals = data?.totals ?? { courses: 0, lessons: 0, enrollments: 0, earnings: 0, students: 0 };

  return (
    <div className="dashboard-page">
      <header className="section-head">
        <div>
          <span className="eyebrow">Instructor</span>
          <h1>Teaching dashboard</h1>
          <p className="muted">Enrollments and earnings across the courses you teach.</p>
        </div>
      </header>

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <section className="stat-cards">
        <div className="stat-card">
          <span>Courses</span>
          <strong>{totals.courses}</strong>
        </div>
        <div className="stat-card">
          <span>Students</span>
          <strong>{totals.students}</strong>
        </div>
        <div className="stat-card">
          <span>Enrollments</span>
          <strong>{totals.enrollments}</strong>
        </div>
        <div className="stat-card">
          <span>Earnings</span>
          <strong>{formatCurrency(totals.earnings)}</strong>
        </div>
      </section>

      <section className="panel chart-card">
        <div className="panel-head">
          <div>
            <h2>Enrollments and earnings</h2>
            <p className="muted">Per course. Earnings assume every enrollment paid the listed price.</p>
          </div>
        </div>

        {chart.length === 0 ? (
          <div className="empty-state">
            <h3>No courses yet</h3>
            <p>Create your first course below to see analytics here.</p>
          </div>
        ) : (
          <div className="chart-wrap">
            <Chart
              type="bar"
              data={{
                labels: chart.map((course) => course.title),
                datasets: [
                  {
                    type: 'bar' as const,
                    label: 'Enrollments',
                    data: chart.map((course) => course.enrollments),
                    backgroundColor: 'rgba(79, 70, 229, 0.75)',
                    borderRadius: 8,
                    yAxisID: 'y',
                  },
                  {
                    type: 'line' as const,
                    label: 'Earnings (₹)',
                    data: chart.map((course) => course.earnings),
                    borderColor: '#059669',
                    backgroundColor: '#059669',
                    tension: 0.35,
                    pointRadius: 4,
                    yAxisID: 'y1',
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: { precision: 0 },
                    title: { display: true, text: 'Enrollments' },
                  },
                  y1: {
                    beginAtZero: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    title: { display: true, text: 'Earnings (₹)' },
                  },
                },
                plugins: {
                  legend: { position: 'bottom' },
                },
              }}
            />
          </div>
        )}
      </section>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Your courses</h2>
              <p className="muted">Open a course to add lessons, build a quiz or schedule a live class.</p>
            </div>
          </div>
          {chart.length === 0 ? (
            <p className="muted">Nothing here yet.</p>
          ) : (
            <ul className="course-rows">
              {chart.map((course) => (
                <li key={course.courseId}>
                  <div>
                    <Link to={`/courses/${course.courseId}`}>
                      <strong>{course.title}</strong>
                    </Link>
                    <small>
                      {course.lessons} lessons · {course.enrollments} enrolled · {formatPrice(course.price)}
                    </small>
                    <small className="muted">{formatDate(course.liveClassAt)}</small>
                  </div>
                  <div className="course-row-actions">
                    <span className="badge">{formatCurrency(course.earnings)}</span>
                    <Link to={`/courses/${course.courseId}`} className="btn btn-ghost btn-sm">
                      Manage
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel create-course">
          <div className="panel-head">
            <div>
              <h2>Create a course</h2>
              <p className="muted">It goes live immediately with an empty syllabus.</p>
            </div>
          </div>
          <form onSubmit={handleCreate} className="stack">
            <label className="field">
              <span>Title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                minLength={3}
                placeholder="TypeScript for Busy People"
              />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                required
                minLength={10}
                rows={4}
                placeholder="What the course covers and who it is for."
              />
            </label>
            <div className="field-row">
              <label className="field">
                <span>Price (₹)</span>
                <input
                  type="number"
                  min={0}
                  max={1000000}
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Live class (optional)</span>
                <input
                  type="datetime-local"
                  value={liveClassAt}
                  onChange={(event) => setLiveClassAt(event.target.value)}
                />
              </label>
            </div>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Creating…' : 'Create course'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
