import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';
import type { CourseSummary } from '../types';
import { formatPrice } from '../utils';

export default function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    api<{ courses: CourseSummary[] }>('/courses')
      .then((data) => {
        if (!cancelled) setCourses(data.courses);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load courses.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return courses;
    return courses.filter(
      (course) =>
        course.title.toLowerCase().includes(term) ||
        course.description.toLowerCase().includes(term) ||
        course.instructor.name.toLowerCase().includes(term)
    );
  }, [courses, query]);

  const totalLessons = courses.reduce((sum, course) => sum + course.lessonCount, 0);

  return (
    <div className="courses-page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">A tiny learning platform</span>
          <h1>Pick a course. Finish it this week.</h1>
          <p>
            Short, focused courses with video lessons, a quiz and a certificate at the end. Built as a
            mini LMS demo with React, Express and Prisma.
          </p>
          <div className="hero-actions">
            <a href="#catalogue" className="btn btn-primary">
              Browse courses
            </a>
            {!user && (
              <Link to="/login?mode=register" className="btn btn-ghost">
                Create an account
              </Link>
            )}
            {user?.role === 'INSTRUCTOR' && (
              <Link to="/dashboard" className="btn btn-ghost">
                Instructor dashboard
              </Link>
            )}
          </div>
        </div>
        <div className="hero-stats">
          <div>
            <strong>{courses.length}</strong>
            <span>courses</span>
          </div>
          <div>
            <strong>{totalLessons}</strong>
            <span>lessons</span>
          </div>
          <div>
            <strong>{courses.reduce((sum, course) => sum + course.enrollmentCount, 0)}</strong>
            <span>enrollments</span>
          </div>
        </div>
      </section>

      <section id="catalogue" className="catalogue">
        <div className="section-head">
          <div>
            <h2>Course catalogue</h2>
            <p className="muted">Taught by independent instructors on MiniLearn.</p>
          </div>
          <input
            className="search-input"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search courses or instructors"
            aria-label="Search courses"
          />
        </div>

        {loading && <div className="page-loader">Loading courses…</div>}
        {error && <div className="alert alert-error">{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className="empty-state">
            <h3>No courses match “{query}”.</h3>
            <p>Try a different search term.</p>
          </div>
        )}

        <div className="course-grid">
          {filtered.map((course) => (
            <article key={course.id} className="course-card">
              <div className="course-cover" aria-hidden="true">
                <span>{course.title.charAt(0)}</span>
                {course.price === 0 && <em>Free</em>}
              </div>
              <div className="course-body">
                <div className="course-meta">
                  <span>{course.instructor.name}</span>
                  <span>{course.lessonCount} lessons</span>
                  {course.quiz && <span className="badge">{course.quiz.questionCount}-question quiz</span>}
                </div>
                <h3>{course.title}</h3>
                <p>{course.description}</p>
                <div className="course-foot">
                  <strong>{formatPrice(course.price)}</strong>
                  <Link to={`/courses/${course.id}`} className="btn btn-primary btn-sm">
                    View course
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
