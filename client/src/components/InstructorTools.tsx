import { FormEvent, useState } from 'react';
import { api } from '../api';
import type { QuizMeta } from '../types';

interface InstructorToolsProps {
  courseId: string;
  quiz: QuizMeta | null;
  onSaved: () => Promise<void> | void;
}

interface DraftQuestion {
  text: string;
  options: string[];
  correctIndex: number;
}

function emptyQuestion(): DraftQuestion {
  return { text: '', options: ['', '', '', ''], correctIndex: 0 };
}

export function AddLessonForm({ courseId, onSaved }: Pick<InstructorToolsProps, 'courseId' | 'onSaved'>) {
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState(
    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
  );
  const [durationMin, setDurationMin] = useState('10');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setBusy(true);
    try {
      await api(`/courses/${courseId}/lessons`, {
        method: 'POST',
        body: { title, videoUrl, durationMin: Number(durationMin) || undefined },
      });
      setTitle('');
      setSaved(true);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add the lesson.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="tool-card" onSubmit={handleSubmit}>
      <h3>Add a lesson</h3>
      <p className="muted">Paste a public video link — the demo skips the upload pipeline.</p>
      <label className="field">
        <span>Lesson title</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} placeholder="Hooks in practice" />
      </label>
      <label className="field">
        <span>Video URL</span>
        <input
          type="url"
          value={videoUrl}
          onChange={(event) => setVideoUrl(event.target.value)}
          required
          placeholder="https://…/video.mp4"
        />
      </label>
      <label className="field">
        <span>Duration (minutes)</span>
        <input
          type="number"
          min={1}
          max={600}
          value={durationMin}
          onChange={(event) => setDurationMin(event.target.value)}
        />
      </label>
      {error && <p className="form-error">{error}</p>}
      {saved && <p className="form-success">Lesson added.</p>}
      <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
        {busy ? 'Adding…' : 'Add lesson'}
      </button>
    </form>
  );
}

export function QuizBuilder({ courseId, quiz, onSaved }: InstructorToolsProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(quiz?.title ?? 'Course quiz');
  const [passPercent, setPassPercent] = useState(String(quiz?.passPercent ?? 60));
  const [questions, setQuestions] = useState<DraftQuestion[]>([emptyQuestion()]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function updateQuestion(index: number, patch: Partial<DraftQuestion>) {
    setQuestions((current) => current.map((question, i) => (i === index ? { ...question, ...patch } : question)));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (questions.some((question) => question.options.some((option) => !option.trim()))) {
      setError('Fill in all four options for every question.');
      return;
    }

    setBusy(true);
    try {
      await api(`/courses/${courseId}/quiz`, {
        method: 'POST',
        body: {
          title,
          passPercent: Number(passPercent),
          questions: questions.map((question) => ({
            text: question.text.trim(),
            options: question.options.map((option) => option.trim()),
            correctIndex: question.correctIndex,
          })),
        },
      });
      setOpen(false);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the quiz.');
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <div className="tool-card">
        <h3>Course quiz</h3>
        <p className="muted">
          {quiz
            ? `${quiz.questionCount} questions · pass mark ${quiz.passPercent}%. Replacing it resets past attempts.`
            : 'No quiz yet. Add an MCQ quiz so students can unlock their certificate.'}
        </p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
          {quiz ? 'Replace quiz' : 'Create quiz'}
        </button>
      </div>
    );
  }

  return (
    <form className="tool-card" onSubmit={handleSubmit}>
      <div className="tool-head">
        <h3>{quiz ? 'Replace quiz' : 'Create quiz'}</h3>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <div className="field-row">
        <label className="field">
          <span>Quiz title</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={2} />
        </label>
        <label className="field">
          <span>Pass mark (%)</span>
          <input
            type="number"
            min={1}
            max={100}
            value={passPercent}
            onChange={(event) => setPassPercent(event.target.value)}
          />
        </label>
      </div>

      {questions.map((question, questionIndex) => (
        <fieldset key={questionIndex} className="quiz-draft">
          <legend>Question {questionIndex + 1}</legend>
          <label className="field">
            <span>Question</span>
            <input
              value={question.text}
              onChange={(event) => updateQuestion(questionIndex, { text: event.target.value })}
              required
              minLength={3}
              placeholder="Which hook stores component state?"
            />
          </label>
          <div className="options-grid">
            {question.options.map((option, optionIndex) => (
              <label key={optionIndex} className="option-field">
                <input
                  type="radio"
                  name={`correct-${questionIndex}`}
                  checked={question.correctIndex === optionIndex}
                  onChange={() => updateQuestion(questionIndex, { correctIndex: optionIndex })}
                  aria-label={`Mark option ${optionIndex + 1} correct`}
                />
                <input
                  value={option}
                  onChange={(event) =>
                    updateQuestion(questionIndex, {
                      options: question.options.map((value, i) => (i === optionIndex ? event.target.value : value)),
                    })
                  }
                  required
                  placeholder={`Option ${optionIndex + 1}`}
                />
              </label>
            ))}
          </div>
          <small className="muted">Select the radio button beside the correct answer.</small>
          {questions.length > 1 && (
            <button
              type="button"
              className="link-button"
              onClick={() => setQuestions((current) => current.filter((_, i) => i !== questionIndex))}
            >
              Remove question
            </button>
          )}
        </fieldset>
      ))}

      <div className="tool-actions">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setQuestions((current) => [...current, emptyQuestion()])}
          disabled={questions.length >= 10}
        >
          Add question
        </button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
          {busy ? 'Saving…' : 'Save quiz'}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
