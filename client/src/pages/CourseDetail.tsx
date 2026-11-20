import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, downloadCertificate } from '../api';
import { useAuth } from '../auth';
import { AddLessonForm, QuizBuilder } from '../components/InstructorTools';
import ProgressBar from '../components/ProgressBar';
import QuizPanel from '../components/QuizPanel';
import type { CourseDetailResponse, Progress } from '../types';
import { formatDate, formatDuration, formatPrice, formatShortDate, jitsiLink } from '../utils';

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<CourseDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const response = await api<CourseDetailResponse>(`/courses/${id}`);
      setData(response);
      setError(null);
      setActiveLessonId((current) => {
        if (current && response.course.lessons.some((lesson) => lesson.id === current)) return current;
        const next =
          response.course.lessons.find((lesson) => !response.viewer.completedLessonIds.includes(lesson.id)) ??
          response.course.lessons[0];
        return next?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this course.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (authLoading) return;
    void load();
  }, [authLoading, load, user?.id]);

  async function handleEnroll() {
    if (!id) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/courses/${id}/enroll`, { method: 'POST', body: {} });
      setNotice('Enrolled. The demo payment was accepted — start with lesson one.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not enroll.');
    } finally {
      setBusy(false);
    }
  }

  async function handleComplete(enrollmentId: string, lessonId: string) {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ progress: Progress }>(
        `/enrollments/${enrollmentId}/lessons/${lessonId}/complete`,
        { method: 'POST', body: {} }
      );
      setData((current) =>
        current
          ? {
              ...current,
              viewer: {
                ...current.viewer,
                completedLessonIds: [...new Set([...current.viewer.completedLessonIds, lessonId])],
                progress: result.progress,
              },
            }
          : current
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark this lesson complete.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCertificate() {
    if (!data) return;
    setDownloading(true);
    setError(null);
    try {
      await downloadCertificate(data.course.id, data.course.title);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not download the certificate.');
    } finally {
      setDownloading(false);
    }
  }

  if (loading || authLoading) return <div className="page-loader">Loading course…</div>;
  if (!data) {
    return (
      <div className="empty-state">
        <h2>Course not found</h2>
        <p>{error ?? 'This course may have been removed.'}</p>
        <Link to="/" className="btn btn-primary btn-sm">
          Back to courses
        </Link>
      </div>
    );
  }

  const { course, viewer } = data;
  const isEnrolled = Boolean(viewer.enrollment);
  const activeLesson = course.lessons.find((lesson) => lesson.id === activeLessonId) ?? null;
  const activeCompleted = activeLesson ? viewer.completedLessonIds.includes(activeLesson.id) : false;
  const isStudent = user?.role === 'STUDENT';

  return (
    <div className="course-detail">
      <Link to="/" className="back-link">
        ← All courses
      </Link>

      <header className="course-header">
        <div className="course-header-main">
          <span className="eyebrow">{course.instructor.name}</span>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
          <div className="meta-row">
            <span>{course.lessons.length} lessons</span>
            <span>{course.enrollmentCount} enrolled</span>
            {isEnrolled && viewer.bestAttempt && <span>Best quiz score: {viewer.bestAttempt.percent}%</span>}
            {course.quiz && <span>{course.quiz.questionCount}-question quiz</span>}
          </div>
        </div>
        <div className="course-header-side">
          <strong className="price">{formatPrice(course.price)}</strong>
          {isEnrolled ? (
            <span className="badge badge-success">Enrolled</span>
          ) : isStudent ? (
            <button type="button" className="btn btn-primary" onClick={handleEnroll} disabled={busy}>
              {busy ? 'Enrolling…' : course.price === 0 ? 'Enroll for free' : `Enroll · ${formatPrice(course.price)}`}
            </button>
          ) : !user ? (
            <Link to="/login" className="btn btn-primary">
              Sign in to enroll
            </Link>
          ) : (
            <span className="badge">Instructor account</span>
          )}
          {course.liveClassAt && (
            <a className="btn btn-ghost btn-sm" href={jitsiLink(course.id)} target="_blank" rel="noreferrer">
              Join live class · {formatShortDate(course.liveClassAt)}
            </a>
          )}
        </div>
      </header>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {viewer.canManage && (
        <section className="instructor-tools">
          <h2>Manage this course</h2>
          <div className="tools-grid">
            <AddLessonForm courseId={course.id} onSaved={load} />
            <QuizBuilder courseId={course.id} quiz={course.quiz} onSaved={load} />
          </div>
        </section>
      )}

      {isEnrolled && viewer.enrollment ? (
        <div className="learning-layout">
          <div className="learning-main">
            <div className="panel player-panel">
              {activeLesson ? (
                <>
                  <video
                    key={activeLesson.id}
                    className="video"
                    controls
                    preload="metadata"
                    src={activeLesson.videoUrl}
                  />
                  <div className="player-meta">
                    <div>
                      <h2>{activeLesson.title}</h2>
                      <p className="muted">
                        Lesson {activeLesson.position} of {course.lessons.length}
                        {activeLesson.durationMin ? ` · ${formatDuration(activeLesson.durationMin)}` : ''}
                      </p>
                    </div>
                    {activeCompleted ? (
                      <span className="badge badge-success">Completed</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => handleComplete(viewer.enrollment!.id, activeLesson.id)}
                        disabled={busy}
                      >
                        {busy ? 'Saving…' : 'Mark complete'}
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <h3>No lessons yet</h3>
                  <p>The instructor has not added any lessons to this course.</p>
                </div>
              )}
            </div>

            {course.lessons.length > 0 && (
              <div className="panel">
                <h2>Lessons</h2>
                <ol className="lesson-list">
                  {course.lessons.map((lesson) => {
                    const done = viewer.completedLessonIds.includes(lesson.id);
                    return (
                      <li key={lesson.id} className={lesson.id === activeLessonId ? 'active' : ''}>
                        <button type="button" onClick={() => setActiveLessonId(lesson.id)}>
                          <span className={`lesson-number ${done ? 'done' : ''}`}>{done ? '✓' : lesson.position}</span>
                          <span className="lesson-title">{lesson.title}</span>
                          <span className="lesson-duration">{formatDuration(lesson.durationMin)}</span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {course.quiz ? (
              <QuizPanel courseId={course.id} bestAttempt={viewer.bestAttempt} onAttemptSaved={load} />
            ) : (
              <div className="panel">
                <h2>Quiz</h2>
                <p className="muted">The instructor has not added a quiz to this course yet.</p>
              </div>
            )}
          </div>

          <aside className="learning-side">
            <div className="panel">
              <h2>Your progress</h2>
              <ProgressBar percent={viewer.progress.percent} label={`${viewer.progress.completed}/${viewer.progress.total} lessons`} />
              <ul className="stat-list">
                <li>
                  <span>Quiz</span>
                  <strong>
                    {viewer.progress.bestPercent !== null
                      ? `${viewer.progress.bestPercent}%${viewer.progress.quizPassed ? ' · passed' : ''}`
                      : 'Not attempted'}
                  </strong>
                </li>
                <li>
                  <span>Enrolled on</span>
                  <strong>{formatShortDate(viewer.enrollment.enrolledAt)}</strong>
                </li>
                <li>
                  <span>Payment</span>
                  <strong>{viewer.enrollment.paymentRef ?? 'Free'}</strong>
                </li>
              </ul>
            </div>

            <div className="panel certificate-card">
              <h2>Certificate</h2>
              <p className="muted">
                Complete every lesson and pass the quiz to unlock your downloadable PDF certificate.
              </p>
              <button
                type="button"
                className="btn btn-primary btn-block"
                onClick={handleCertificate}
                disabled={!viewer.progress.certificateEligible || downloading}
              >
                {downloading ? 'Preparing PDF…' : 'Download certificate'}
              </button>
              {!viewer.progress.certificateEligible && (
                <small className="muted">
                  {viewer.progress.percent < 100
                    ? `${viewer.progress.total - viewer.progress.completed} lesson(s) left`
                    : !course.quiz
                      ? 'This course has no quiz yet'
                      : viewer.progress.quizPassed
                        ? 'Almost there'
                        : 'Pass the quiz to unlock'}
                </small>
              )}
            </div>

            <div className="panel live-card">
              <h2>Live class</h2>
              {course.liveClassAt ? (
                <>
                  <p className="muted">Scheduled for {formatDate(course.liveClassAt)}.</p>
                  <a className="btn btn-ghost btn-block" href={jitsiLink(course.id)} target="_blank" rel="noreferrer">
                    Open Jitsi room
                  </a>
                  <small className="muted">Powered by Jitsi Meet — no install needed.</small>
                </>
              ) : (
                <p className="muted">No live session scheduled for this course.</p>
              )}
            </div>
          </aside>
        </div>
      ) : (
        <div className="course-preview">
          <div className="panel">
            <h2>What you will learn</h2>
            <p className="muted">{course.description}</p>
            {course.lessons.length > 0 ? (
              <ol className="syllabus">
                {course.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <span className="lesson-number">{lesson.position}</span>
                    <div>
                      <strong>{lesson.title}</strong>
                      <small>{formatDuration(lesson.durationMin) || 'Self-paced video'}</small>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p>No lessons published yet.</p>
            )}
          </div>
          <aside className="preview-side">
            <div className="panel">
              <h2>This course includes</h2>
              <ul className="check-list">
                <li>{course.lessons.length} video lessons</li>
                <li>{course.quiz ? `${course.quiz.questionCount}-question auto-graded quiz` : 'Quiz coming soon'}</li>
                <li>Progress tracking</li>
                <li>Completion certificate</li>
                {course.liveClassAt && <li>Live session on {formatShortDate(course.liveClassAt)}</li>}
              </ul>
              {isStudent ? (
                <button type="button" className="btn btn-primary btn-block" onClick={handleEnroll} disabled={busy}>
                  {busy ? 'Enrolling…' : course.price === 0 ? 'Enroll for free' : `Enroll · ${formatPrice(course.price)}`}
                </button>
              ) : !user ? (
                <Link to="/login" className="btn btn-primary btn-block">
                  Sign in to enroll
                </Link>
              ) : (
                <p className="muted">You are signed in as an instructor. Students enroll from this page.</p>
              )}
              <small className="muted">Demo checkout — no real payment is taken.</small>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
