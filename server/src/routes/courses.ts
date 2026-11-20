import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { optionalAuth, requireAuth, requireRole } from '../auth';
import { asyncHandler } from '../http';
import { getProgress } from '../progress';

export const coursesRouter = Router();

const courseSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(120),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(4000),
  price: z.coerce.number().int('Price must be a whole number').min(0).max(1_000_000).default(0),
  liveClassAt: z.string().datetime({ offset: true }).nullable().optional(),
});

const lessonSchema = z.object({
  title: z.string().trim().min(2, 'Lesson title is too short').max(120),
  videoUrl: z.string().trim().url('Video URL must be a valid link'),
  durationMin: z.coerce.number().int().min(1).max(600).optional(),
});

const quizSchema = z.object({
  title: z.string().trim().min(2).max(120).default('Course quiz'),
  passPercent: z.coerce.number().int().min(1).max(100).default(60),
  questions: z
    .array(
      z
        .object({
          text: z.string().trim().min(3, 'Question text is too short').max(500),
          options: z.array(z.string().trim().min(1)).min(2, 'Add at least two options').max(6),
          correctIndex: z.coerce.number().int().min(0),
        })
        .refine((question) => question.correctIndex < question.options.length, {
          message: 'Correct answer must point at one of the options',
        })
    )
    .min(1, 'Add at least one question')
    .max(20),
});

export function quizMeta(quiz: { id: string; title: string; passPercent: number; questions: { id: string }[] } | null) {
  if (!quiz) return null;
  return { id: quiz.id, title: quiz.title, passPercent: quiz.passPercent, questionCount: quiz.questions.length };
}

function canManageCourse(
  user: { id: string; isAdmin: boolean } | undefined,
  course: { instructorId: string }
) {
  if (!user) return false;
  return user.isAdmin || user.id === course.instructorId;
}

coursesRouter.get(
  '/',
  optionalAuth,
  asyncHandler(async (_req, res) => {
    const courses = await prisma.course.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        instructor: { select: { id: true, name: true } },
        lessons: { select: { id: true } },
        quiz: { select: { id: true, title: true, passPercent: true, questions: { select: { id: true } } } },
        _count: { select: { enrollments: true } },
      },
    });

    res.json({
      courses: courses.map((course) => ({
        id: course.id,
        title: course.title,
        description: course.description,
        price: course.price,
        thumbnailUrl: course.thumbnailUrl,
        liveClassAt: course.liveClassAt,
        createdAt: course.createdAt,
        instructor: course.instructor,
        lessonCount: course.lessons.length,
        enrollmentCount: course._count.enrollments,
        quiz: quizMeta(course.quiz),
      })),
    });
  })
);

coursesRouter.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: {
        instructor: { select: { id: true, name: true } },
        lessons: { orderBy: { position: 'asc' } },
        quiz: { select: { id: true, title: true, passPercent: true, questions: { select: { id: true } } } },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) {
      res.status(404).json({ error: 'Course not found.' });
      return;
    }

    let viewer: {
      enrollment: { id: string; enrolledAt: Date; paymentRef: string | null } | null;
      completedLessonIds: string[];
      isOwner: boolean;
      canManage: boolean;
      progress: Awaited<ReturnType<typeof getProgress>>['progress'];
      bestAttempt: { score: number; total: number; percent: number; passed: boolean; createdAt: Date } | null;
    } = {
      enrollment: null,
      completedLessonIds: [],
      isOwner: false,
      canManage: false,
      progress: {
        completed: 0,
        total: course.lessons.length,
        percent: 0,
        quizPassed: false,
        bestPercent: null,
        certificateEligible: false,
      },
      bestAttempt: null,
    };

    if (req.user) {
      const enrollment = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: req.user.id, courseId: course.id } },
        include: { completions: { select: { lessonId: true } } },
      });
      const { progress } = await getProgress(req.user.id, course.id);

      const bestAttempt = course.quiz
        ? await prisma.quizAttempt.findFirst({
            where: { quizId: course.quiz.id, userId: req.user.id },
            orderBy: { percent: 'desc' },
            select: { score: true, total: true, percent: true, passed: true, createdAt: true },
          })
        : null;

      viewer = {
        enrollment: enrollment
          ? { id: enrollment.id, enrolledAt: enrollment.enrolledAt, paymentRef: enrollment.paymentRef }
          : null,
        completedLessonIds: enrollment?.completions.map((completion) => completion.lessonId) ?? [],
        isOwner: course.instructorId === req.user.id,
        canManage: canManageCourse(req.user, course),
        progress,
        bestAttempt,
      };
    }

    res.json({
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        price: course.price,
        thumbnailUrl: course.thumbnailUrl,
        liveClassAt: course.liveClassAt,
        createdAt: course.createdAt,
        instructor: course.instructor,
        enrollmentCount: course._count.enrollments,
        lessons: course.lessons,
        quiz: quizMeta(course.quiz),
      },
      viewer,
    });
  })
);

coursesRouter.post(
  '/',
  requireAuth,
  requireRole('INSTRUCTOR'),
  asyncHandler(async (req, res) => {
    const parsed = courseSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid course details' });
      return;
    }

    const { title, description, price, liveClassAt } = parsed.data;
    const course = await prisma.course.create({
      data: {
        title,
        description,
        price,
        liveClassAt: liveClassAt ? new Date(liveClassAt) : null,
        instructorId: req.user!.id,
      },
    });

    res.status(201).json({ course });
  })
);

coursesRouter.post(
  '/:id/lessons',
  requireAuth,
  requireRole('INSTRUCTOR'),
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) {
      res.status(404).json({ error: 'Course not found.' });
      return;
    }
    if (!canManageCourse(req.user, course)) {
      res.status(403).json({ error: 'You can only edit your own courses.' });
      return;
    }

    const parsed = lessonSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid lesson details' });
      return;
    }

    const lastLesson = await prisma.lesson.findFirst({
      where: { courseId: course.id },
      orderBy: { position: 'desc' },
    });

    const lesson = await prisma.lesson.create({
      data: {
        courseId: course.id,
        title: parsed.data.title,
        videoUrl: parsed.data.videoUrl,
        durationMin: parsed.data.durationMin ?? null,
        position: (lastLesson?.position ?? 0) + 1,
      },
    });

    res.status(201).json({ lesson });
  })
);

coursesRouter.post(
  '/:id/quiz',
  requireAuth,
  requireRole('INSTRUCTOR'),
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) {
      res.status(404).json({ error: 'Course not found.' });
      return;
    }
    if (!canManageCourse(req.user, course)) {
      res.status(403).json({ error: 'You can only edit your own courses.' });
      return;
    }

    const parsed = quizSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid quiz details' });
      return;
    }

    const { title, passPercent, questions } = parsed.data;

    // One quiz per course: replace the existing one and its attempts.
    const quiz = await prisma.$transaction(async (tx) => {
      const existing = await tx.quiz.findUnique({ where: { courseId: course.id } });
      if (existing) {
        await tx.quizAttempt.deleteMany({ where: { quizId: existing.id } });
        await tx.question.deleteMany({ where: { quizId: existing.id } });
        await tx.quiz.delete({ where: { id: existing.id } });
      }

      return tx.quiz.create({
        data: {
          courseId: course.id,
          title,
          passPercent,
          questions: {
            create: questions.map((question, index) => ({
              text: question.text,
              options: JSON.stringify(question.options),
              correctIndex: question.correctIndex,
              position: index + 1,
            })),
          },
        },
        include: { questions: { select: { id: true } } },
      });
    });

    res.status(201).json({ quiz: quizMeta(quiz) });
  })
);
