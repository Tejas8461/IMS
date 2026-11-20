import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, downloadCertificate } from '../api';
import ProgressBar from '../components/ProgressBar';
import type { EnrollmentItem } from '../types';
import { formatShortDate } from '../utils';

export default function MyLearning() {
  const [items, setItems] = useState<EnrollmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<{ enrollments: EnrollmentItem[] }>('/my/enrollments')
      .then((data) => {
        if (!cancelled) setItems(data.enrollments);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load your courses.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCertificate(item: EnrollmentItem) {
    setDownloadingId(item.id);
    setError(null);
    try {
      await downloadCertificate(item.course.id, item.course.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download the certificate.');
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="my-learning">
      <header className="section-head">
        <div>
          <span className="eyebrow">Your shelf</span>
          <h1>My learning</h1>
          <p className="muted">Everything you are enrolled in, with progress and certificates.</p>
        </div>
        <Link to="/" className="btn btn-ghost btn-sm">
          Find another course
        </Link>
      </header>

      {loading && <div className="page-loader">Loading your courses…</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && items.length === 0 && (
        <div className="empty-state">
          <h3>You are not enrolled in anything yet.</h3>
          <p>Pick a course from the catalogue and your progress will show up here.</p>
          <Link to="/" className="btn btn-primary btn-sm">
            Browse courses
          </Link>
        </div>
      )}

      <div className="learning-cards">
        {items.map((item) => {
          const done = item.progress.percent === 100;
          return (
            <article key={item.id} className="panel learning-card">
              <div className="learning-card-head">
                <div>
                  <span className="eyebrow">{item.course.instructor.name}</span>
                  <h2>{item.course.title}</h2>
                </div>
                {done ? (
                  <span className="badge badge-success">Completed</span>
                ) : (
                  <span className="badge">{item.progress.percent}%</span>
                )}
              </div>

              <ProgressBar
                percent={item.progress.percent}
                label={`${item.progress.completed}/${item.progress.total} lessons`}
              />

              <ul className="stat-list">
                <li>
                  <span>Quiz</span>
                  <strong>
                    {item.progress.bestPercent !== null
                      ? `${item.progress.bestPercent}%${item.progress.quizPassed ? ' · passed' : ' · retry'}`
                      : 'Not attempted'}
                  </strong>
                </li>
                <li>
                  <span>Enrolled</span>
                  <strong>{formatShortDate(item.enrolledAt)}</strong>
                </li>
                <li>
                  <span>Certificate</span>
                  <strong>{item.progress.certificateEligible ? 'Ready' : 'Locked'}</strong>
                </li>
              </ul>

              <div className="learning-card-actions">
                <Link to={`/courses/${item.course.id}`} className="btn btn-primary btn-sm">
                  {done ? 'Review course' : item.progress.percent === 0 ? 'Start learning' : 'Continue'}
                </Link>
                {item.progress.certificateEligible && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleCertificate(item)}
                    disabled={downloadingId === item.id}
                  >
                    {downloadingId === item.id ? 'Preparing…' : 'Certificate PDF'}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
