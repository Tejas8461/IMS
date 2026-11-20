import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth, requireRole } from '../auth';
import { asyncHandler } from '../http';

export const instructorRouter = Router();

instructorRouter.get(
  '/instructor/dashboard',
  requireAuth,
  requireRole('INSTRUCTOR'),
  asyncHandler(async (req, res) => {
    const courses = await prisma.course.findMany({
      where: { instructorId: req.user!.id },
      orderBy: { createdAt: 'asc' },
      include: {
        _count: { select: { enrollments: true, lessons: true } },
      },
    });

    const chart = courses.map((course) => ({
      courseId: course.id,
      title: course.title,
      enrollments: course._count.enrollments,
      earnings: course._count.enrollments * course.price,
      price: course.price,
      lessons: course._count.lessons,
      liveClassAt: course.liveClassAt,
    }));

    const students = await prisma.enrollment.findMany({
      where: { course: { instructorId: req.user!.id } },
      distinct: ['userId'],
      select: { userId: true },
    });

    res.json({
      chart,
      totals: {
        courses: courses.length,
        lessons: chart.reduce((sum, course) => sum + course.lessons, 0),
        enrollments: chart.reduce((sum, course) => sum + course.enrollments, 0),
        earnings: chart.reduce((sum, course) => sum + course.earnings, 0),
        students: students.length,
      },
    });
  })
);
