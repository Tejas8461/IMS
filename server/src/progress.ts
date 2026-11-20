import { prisma } from './db';

export interface CourseProgress {
  completed: number;
  total: number;
  percent: number;
  quizPassed: boolean;
  bestPercent: number | null;
  certificateEligible: boolean;
}

export async function getProgress(userId: string, courseId: string): Promise<{
  enrollmentId: string | null;
  progress: CourseProgress;
}> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      lessons: { select: { id: true } },
      quiz: { select: { id: true } },
    },
  });

  if (!course) {
    return {
      enrollmentId: null,
      progress: { completed: 0, total: 0, percent: 0, quizPassed: false, bestPercent: null, certificateEligible: false },
    };
  }

  const enrollment = await prisma.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    include: { completions: { select: { lessonId: true } } },
  });

  const total = course.lessons.length;
  const lessonIds = new Set(course.lessons.map((lesson) => lesson.id));
  const completed = enrollment ? enrollment.completions.filter((c) => lessonIds.has(c.lessonId)).length : 0;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  let bestPercent: number | null = null;
  let quizPassed = false;
  if (course.quiz) {
    const best = await prisma.quizAttempt.findFirst({
      where: { quizId: course.quiz.id, userId },
      orderBy: { percent: 'desc' },
    });
    bestPercent = best?.percent ?? null;
    quizPassed = best?.passed ?? false;
  }

  return {
    enrollmentId: enrollment?.id ?? null,
    progress: {
      completed,
      total,
      percent,
      quizPassed,
      bestPercent,
      certificateEligible: Boolean(enrollment) && total > 0 && percent === 100 && quizPassed,
    },
  };
}
