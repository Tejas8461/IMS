import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth } from '../auth';
import { asyncHandler, parseJsonArray } from '../http';

export const quizRouter = Router();

async function findCourseForQuiz(courseId: string) {
  return prisma.course.findUnique({
    where: { id: courseId },
    include: {
      quiz: { include: { questions: { orderBy: { position: 'asc' } } } },
    },
  });
}

quizRouter.get(
  '/courses/:id/quiz',
  requireAuth,
  asyncHandler(async (req, res) => {
    const course = await findCourseForQuiz(req.params.id);
    if (!course) {
      res.status(404).json({ error: 'Course not found.' });
      return;
    }
    if (!course.quiz) {
      res.status(404).json({ error: 'This course does not have a quiz yet.' });
      return;
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: req.user!.id, courseId: course.id } },
    });
    const canManage = req.user!.isAdmin || req.user!.id === course.instructorId;
    if (!enrollment && !canManage) {
      res.status(403).json({ error: 'Enroll in the course to take the quiz.' });
      return;
    }

    const bestAttempt = await prisma.quizAttempt.findFirst({
      where: { quizId: course.quiz.id, userId: req.user!.id },
      orderBy: { percent: 'desc' },
      select: { score: true, total: true, percent: true, passed: true, createdAt: true },
    });

    res.json({
      quiz: {
        id: course.quiz.id,
        title: course.quiz.title,
        passPercent: course.quiz.passPercent,
        questions: course.quiz.questions.map((question) => ({
          id: question.id,
          text: question.text,
          options: parseJsonArray(question.options),
        })),
      },
      bestAttempt,
    });
  })
);

const submitSchema = z.object({
  answers: z.array(z.coerce.number().int().min(-1)).max(50),
});

quizRouter.post(
  '/courses/:id/quiz/submit',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Send an answers array, with one index per question.' });
      return;
    }

    const course = await findCourseForQuiz(req.params.id);
    if (!course || !course.quiz) {
      res.status(404).json({ error: 'This course does not have a quiz yet.' });
      return;
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: req.user!.id, courseId: course.id } },
    });
    if (!enrollment) {
      res.status(403).json({ error: 'Enroll in the course to take the quiz.' });
      return;
    }

    const questions = course.quiz.questions;
    if (questions.length === 0) {
      res.status(400).json({ error: 'This quiz has no questions yet.' });
      return;
    }

    const answers = questions.map((_, index) => parsed.data.answers[index] ?? -1);
    const score = questions.reduce(
      (total, question, index) => total + (answers[index] === question.correctIndex ? 1 : 0),
      0
    );
    const total = questions.length;
    const percent = Math.round((score / total) * 100);
    const passed = percent >= course.quiz.passPercent;

    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId: course.quiz.id,
        userId: req.user!.id,
        score,
        total,
        percent,
        passed,
        answers: JSON.stringify(answers),
      },
    });

    res.status(201).json({
      attempt: {
        id: attempt.id,
        score,
        total,
        percent,
        passed,
        createdAt: attempt.createdAt,
        passPercent: course.quiz.passPercent,
      },
      results: questions.map((question, index) => ({
        questionId: question.id,
        correctIndex: question.correctIndex,
        yourAnswer: answers[index],
        correct: answers[index] === question.correctIndex,
      })),
    });
  })
);
