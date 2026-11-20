import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { prisma } from '../db';
import { requireAuth, requireRole } from '../auth';
import { asyncHandler } from '../http';
import { getProgress } from '../progress';

export const enrollmentsRouter = Router();

enrollmentsRouter.post(
  '/courses/:id/enroll',
  requireAuth,
  requireRole('STUDENT'),
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: { lessons: { select: { id: true } } },
    });
    if (!course) {
      res.status(404).json({ error: 'Course not found.' });
      return;
    }
    if (course.lessons.length === 0) {
      res.status(400).json({ error: 'This course has no lessons yet.' });
      return;
    }

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: req.user!.id, courseId: course.id } },
    });
    if (existing) {
      res.status(409).json({ error: 'You are already enrolled in this course.', enrollmentId: existing.id });
      return;
    }

    // Mock payment step: a real integration would verify a gateway reference here.
    const paymentRef = `DEMO-PAY-${Date.now().toString().slice(-6)}`;
    const enrollment = await prisma.enrollment.create({
      data: { userId: req.user!.id, courseId: course.id, paymentRef },
    });

    res.status(201).json({ enrollment: { id: enrollment.id, courseId: enrollment.courseId, paymentRef } });
  })
);

enrollmentsRouter.get(
  '/my/enrollments',
  requireAuth,
  asyncHandler(async (req, res) => {
    const enrollments = await prisma.enrollment.findMany({
      where: { userId: req.user!.id },
      orderBy: { enrolledAt: 'desc' },
      include: {
        course: {
          include: {
            instructor: { select: { id: true, name: true } },
            lessons: { orderBy: { position: 'asc' }, select: { id: true } },
            quiz: { select: { id: true, title: true, passPercent: true, questions: { select: { id: true } } } },
          },
        },
        completions: { select: { lessonId: true } },
      },
    });

    const items = [];
    for (const enrollment of enrollments) {
      const { progress } = await getProgress(req.user!.id, enrollment.courseId);
      const completedIds = new Set(enrollment.completions.map((completion) => completion.lessonId));
      const nextLesson = enrollment.course.lessons.find((lesson) => !completedIds.has(lesson.id));

      items.push({
        id: enrollment.id,
        enrolledAt: enrollment.enrolledAt,
        paymentRef: enrollment.paymentRef,
        course: {
          id: enrollment.course.id,
          title: enrollment.course.title,
          description: enrollment.course.description,
          price: enrollment.course.price,
          liveClassAt: enrollment.course.liveClassAt,
          instructor: enrollment.course.instructor,
          lessonCount: enrollment.course.lessons.length,
          quiz: enrollment.course.quiz
            ? {
                id: enrollment.course.quiz.id,
                title: enrollment.course.quiz.title,
                passPercent: enrollment.course.quiz.passPercent,
                questionCount: enrollment.course.quiz.questions.length,
              }
            : null,
        },
        progress,
        nextLessonId: nextLesson?.id ?? null,
      });
    }

    res.json({ enrollments: items });
  })
);

enrollmentsRouter.post(
  '/enrollments/:enrollmentId/lessons/:lessonId/complete',
  requireAuth,
  asyncHandler(async (req, res) => {
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: req.params.enrollmentId },
      include: { course: { include: { lessons: { select: { id: true } } } } },
    });

    if (!enrollment || enrollment.userId !== req.user!.id) {
      res.status(404).json({ error: 'Enrollment not found.' });
      return;
    }

    const lesson = await prisma.lesson.findUnique({ where: { id: req.params.lessonId } });
    if (!lesson || lesson.courseId !== enrollment.courseId) {
      res.status(404).json({ error: 'Lesson not found in this course.' });
      return;
    }

    await prisma.lessonCompletion.upsert({
      where: {
        enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: lesson.id },
      },
      create: { enrollmentId: enrollment.id, lessonId: lesson.id },
      update: {},
    });

    const { progress } = await getProgress(req.user!.id, enrollment.courseId);
    res.json({ progress });
  })
);

enrollmentsRouter.get(
  '/courses/:id/certificate',
  requireAuth,
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({
      where: { id: req.params.id },
      include: { instructor: { select: { name: true } }, quiz: { select: { passPercent: true } } },
    });
    if (!course) {
      res.status(404).json({ error: 'Course not found.' });
      return;
    }

    const { progress } = await getProgress(req.user!.id, course.id);
    if (progress.total === 0) {
      res.status(400).json({ error: 'This course has no lessons yet.' });
      return;
    }
    if (progress.percent < 100) {
      res.status(403).json({ error: 'Finish every lesson to unlock the certificate.' });
      return;
    }
    if (!progress.quizPassed) {
      res.status(403).json({ error: 'Pass the course quiz to unlock the certificate.' });
      return;
    }

    const attempt = await prisma.quizAttempt.findFirst({
      where: { userId: req.user!.id, quiz: { courseId: course.id } },
      orderBy: { percent: 'desc' },
    });

    const certificateId = `ML-${course.id.slice(-6).toUpperCase()}-${req.user!.id.slice(-4).toUpperCase()}`;
    const issuedOn = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<void>((resolve) => doc.on('end', () => resolve()));

    doc.rect(24, 24, doc.page.width - 48, doc.page.height - 48).lineWidth(2).strokeColor('#4f46e5').stroke();
    doc.rect(34, 34, doc.page.width - 68, doc.page.height - 68).lineWidth(0.5).strokeColor('#a5b4fc').stroke();

    doc.fillColor('#4f46e5').fontSize(16).font('Helvetica-Bold').text('MiniLearn', { align: 'center' });
    doc.moveDown(1.2);
    doc.fillColor('#111827').fontSize(34).text('Certificate of Completion', { align: 'center' });
    doc.moveDown(1.4);
    doc.fillColor('#374151').fontSize(13).font('Helvetica').text('This certificate is proudly presented to', { align: 'center' });
    doc.moveDown(0.6);
    doc.fillColor('#111827').fontSize(26).font('Helvetica-Bold').text(req.user!.name, { align: 'center' });
    doc.moveDown(0.7);
    doc.fillColor('#374151').fontSize(13).font('Helvetica').text('for successfully completing the course', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('#111827').fontSize(20).font('Helvetica-Bold').text(course.title, { align: 'center' });
    doc.moveDown(0.6);
    doc.fillColor('#374151').fontSize(12).font('Helvetica').text(
      `with a quiz score of ${attempt?.percent ?? 0}% (pass mark ${course.quiz?.passPercent ?? 60}% or higher)`,
      { align: 'center' }
    );

    doc.moveDown(2.2);
    const bottom = doc.page.height - 95;
    doc.fillColor('#6b7280').fontSize(10).font('Helvetica');
    doc.text(`Instructor: ${course.instructor.name}`, 80, bottom, { width: 250 });
    doc.text(`Issued: ${issuedOn}`, 80, bottom + 16, { width: 250 });
    doc.text(`Certificate ID: ${certificateId}`, 0, bottom, { align: 'right', width: doc.page.width - 80 });
    doc.text('Verify with MiniLearn', 0, bottom + 16, { align: 'right', width: doc.page.width - 80 });

    doc.end();
    await finished;

    const safeTitle = course.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="MiniLearn-${safeTitle}.pdf"`);
    res.send(Buffer.concat(chunks));
  })
);
