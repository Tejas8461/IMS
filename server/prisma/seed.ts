import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const lessonVideos = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
];

const courses = [
  {
    title: 'React for Beginners',
    description:
      'Learn components, props, state and hooks by building small, real interfaces. No prior React experience required — just basic JavaScript.',
    price: 999,
    liveClassAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    lessons: [
      { title: 'Thinking in components', videoUrl: lessonVideos[0], durationMin: 12 },
      { title: 'Props and state', videoUrl: lessonVideos[1], durationMin: 15 },
      { title: 'Effects and data fetching', videoUrl: lessonVideos[2], durationMin: 18 },
      { title: 'Building the course player', videoUrl: lessonVideos[3], durationMin: 22 },
    ],
    quiz: {
      title: 'React basics check',
      passPercent: 60,
      questions: [
        {
          text: 'Which hook stores local component state?',
          options: ['useEffect', 'useState', 'useMemo', 'useContext'],
          correctIndex: 1,
        },
        {
          text: 'What is the correct way to pass data into a child component?',
          options: ['Through props', 'By mutating the DOM', 'With global variables', 'Only via Redux'],
          correctIndex: 0,
        },
        {
          text: 'Which dependency array makes a useEffect run only once on mount?',
          options: ['No array', '[count]', '[]', '[props]'],
          correctIndex: 2,
        },
        {
          text: 'JSX attributes for DOM elements are written in…',
          options: ['kebab-case', 'camelCase', 'snake_case', 'UPPERCASE'],
          correctIndex: 1,
        },
      ],
    },
  },
  {
    title: 'Prisma & PostgreSQL Essentials',
    description:
      'Model relational data, run migrations and write type-safe queries with Prisma. Includes relations, seeding and an introduction to query tuning.',
    price: 1499,
    liveClassAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
    lessons: [
      { title: 'Schema and models', videoUrl: lessonVideos[4], durationMin: 14 },
      { title: 'Relations and constraints', videoUrl: lessonVideos[0], durationMin: 17 },
      { title: 'Migrations and seeding', videoUrl: lessonVideos[1], durationMin: 20 },
    ],
    quiz: {
      title: 'Prisma fundamentals',
      passPercent: 70,
      questions: [
        {
          text: 'Which command applies a schema to your database during prototyping?',
          options: ['prisma generate', 'prisma db push', 'prisma format', 'prisma version'],
          correctIndex: 1,
        },
        {
          text: 'A one-to-many relation in Prisma is declared with…',
          options: ['A join table', 'A list field on one side and a scalar foreign key on the other', 'Two scalar fields', 'A raw SQL trigger'],
          correctIndex: 1,
        },
        {
          text: 'What does `prisma seed` do?',
          options: ['Deletes the database', 'Runs the configured seed script', 'Starts Prisma Studio', 'Generates the client'],
          correctIndex: 1,
        },
      ],
    },
  },
  {
    title: 'Design Systems in Figma',
    description:
      'Turn a loose UI kit into a usable design system: colour and type tokens, components, variants and handoff documentation.',
    price: 799,
    lessons: [
      { title: 'Tokens: colour, type, spacing', videoUrl: lessonVideos[2], durationMin: 11 },
      { title: 'Components and variants', videoUrl: lessonVideos[3], durationMin: 16 },
    ],
    quiz: {
      title: 'Design system check',
      passPercent: 60,
      questions: [
        {
          text: 'A design token is…',
          options: ['A single-use mockup', 'A named design decision reused across the system', 'A Figma plugin', 'A type of prototype link'],
          correctIndex: 1,
        },
        {
          text: 'Variants are used to…',
          options: ['Group states of one component', 'Duplicate pages', 'Export assets', 'Comment on frames'],
          correctIndex: 0,
        },
      ],
    },
  },
];

async function main() {
  // Fresh demo data on every seed run.
  await prisma.quizAttempt.deleteMany();
  await prisma.question.deleteMany();
  await prisma.quiz.deleteMany();
  await prisma.lessonCompletion.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();

  const instructor = await prisma.user.create({
    data: {
      name: 'Amelia Rao',
      email: 'instructor@minilearn.dev',
      passwordHash: await bcrypt.hash('teach123', 10),
      role: Role.INSTRUCTOR,
      isAdmin: true,
    },
  });

  await prisma.user.create({
    data: {
      name: 'Platform Admin',
      email: 'admin@minilearn.dev',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: Role.INSTRUCTOR,
      isAdmin: true,
    },
  });

  const student = await prisma.user.create({
    data: {
      name: 'Ravi Kumar',
      email: 'student@minilearn.dev',
      passwordHash: await bcrypt.hash('learn123', 10),
      role: Role.STUDENT,
    },
  });

  const secondStudent = await prisma.user.create({
    data: {
      name: 'Mira Shah',
      email: 'mira@minilearn.dev',
      passwordHash: await bcrypt.hash('learn123', 10),
      role: Role.STUDENT,
    },
  });

  const createdCourses = [];

  for (const courseData of courses) {
    const { lessons, quiz, ...rest } = courseData;
    const course = await prisma.course.create({
      data: {
        ...rest,
        instructorId: instructor.id,
        lessons: {
          create: lessons.map((lesson, index) => ({ ...lesson, position: index + 1 })),
        },
      },
      include: { lessons: { orderBy: { position: 'asc' } } },
    });

    if (quiz) {
      await prisma.quiz.create({
        data: {
          courseId: course.id,
          title: quiz.title,
          passPercent: quiz.passPercent,
          questions: {
            create: quiz.questions.map((question, index) => ({
              text: question.text,
              options: JSON.stringify(question.options),
              correctIndex: question.correctIndex,
              position: index + 1,
            })),
          },
        },
      });
    }

    createdCourses.push(course);
  }

  // Seed some enrollments and progress so the dashboard chart is not empty.
  const reactCourse = createdCourses[0];
  const prismaCourse = createdCourses[1];

  const raviEnrollment = await prisma.enrollment.create({
    data: {
      userId: student.id,
      courseId: reactCourse.id,
      paymentRef: 'DEMO-PAY-1001',
      enrolledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.lessonCompletion.createMany({
    data: reactCourse.lessons.slice(0, 2).map((lesson) => ({
      enrollmentId: raviEnrollment.id,
      lessonId: lesson.id,
    })),
  });

  await prisma.enrollment.create({
    data: {
      userId: secondStudent.id,
      courseId: reactCourse.id,
      paymentRef: 'DEMO-PAY-1002',
      enrolledAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: student.id,
      courseId: prismaCourse.id,
      paymentRef: 'DEMO-PAY-1003',
      enrolledAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('Seeded MiniLearn demo data.');
  console.log('Instructor: instructor@minilearn.dev / teach123');
  console.log('Student:    student@minilearn.dev / learn123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
