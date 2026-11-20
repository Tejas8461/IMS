import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Attempt, QuizPayload, QuizResult } from '../types';

interface QuizPanelProps {
  courseId: string;
  bestAttempt: Attempt | null;
  onAttemptSaved: () => Promise<void> | void;
}

export default function QuizPanel({ courseId, bestAttempt, onAttemptSaved }: QuizPanelProps) {
  const [quiz, setQuiz] = useState<QuizPayload['quiz'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api<QuizPayload>(`/courses/${courseId}/quiz`)
      .then((data) => {
        if (!cancelled) setQuiz(data.quiz);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the quiz.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  async function handleSubmit() {
    if (!quiz) return;
    setError(null);
    if (quiz.questions.some((question) => answers[question.id] === undefined)) {
      setError('Answer every question before submitting.');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        answers: quiz.questions.map((question) => answers[question.id] ?? -1),
      };
      const data = await api<QuizResult>(`/courses/${courseId}/quiz/submit`, { method: 'POST', body: payload });
      setResult(data);
      await onAttemptSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the quiz.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="panel muted">Loading quiz…</div>;
  if (error && !quiz) return <div className="alert alert-error">{error}</div>;
  if (!quiz) return null;

  if (result) {
    return (
      <div className="panel quiz-panel">
        <div className={`quiz-score ${result.attempt.passed ? 'pass' : 'fail'}`}>
          <span>{result.attempt.passed ? 'Passed' : 'Not passed yet'}</span>
          <strong>
            {result.attempt.score}/{result.attempt.total}
          </strong>
          <small>
            {result.attempt.percent}% · pass mark {result.attempt.passPercent}%
          </small>
        </div>
        <ul className="quiz-review">
          {quiz.questions.map((question) => {
            const feedback = result.results.find((item) => item.questionId === question.id);
            const correct = feedback?.correct ?? false;
            return (
              <li key={question.id} className={correct ? 'correct' : 'wrong'}>
                <p>{question.text}</p>
                <small>
                  {correct ? 'Correct' : 'Your answer was wrong'} — correct option:{' '}
                  <strong>{feedback ? question.options[feedback.correctIndex] : '—'}</strong>
                </small>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setResult(null);
            setAnswers({});
          }}
        >
          Retake quiz
        </button>
      </div>
    );
  }

  return (
    <div className="panel quiz-panel">
      <div className="panel-head">
        <div>
          <h2>{quiz.title}</h2>
          <p className="muted">
            {quiz.questions.length} questions · pass mark {quiz.passPercent}%
            {bestAttempt ? ` · best so far ${bestAttempt.percent}%` : ''}
          </p>
        </div>
      </div>

      <ol className="quiz-questions">
        {quiz.questions.map((question, index) => (
          <li key={question.id}>
            <p>
              <span className="question-index">{index + 1}</span>
              {question.text}
            </p>
            <div className="quiz-options">
              {question.options.map((option, optionIndex) => (
                <label key={optionIndex} className={answers[question.id] === optionIndex ? 'selected' : ''}>
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    checked={answers[question.id] === optionIndex}
                    onChange={() => setAnswers((current) => ({ ...current, [question.id]: optionIndex }))}
                  />
                  {option}
                </label>
              ))}
            </div>
          </li>
        ))}
      </ol>

      {error && <p className="form-error">{error}</p>}
      <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={busy}>
        {busy ? 'Grading…' : 'Submit answers'}
      </button>
    </div>
  );
}
