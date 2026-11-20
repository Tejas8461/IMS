export type Role = 'STUDENT' | 'INSTRUCTOR';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isAdmin: boolean;
}

export interface QuizMeta {
  id: string;
  title: string;
  passPercent: number;
  questionCount: number;
}

export interface Lesson {
  id: string;
  title: string;
  videoUrl: string;
  durationMin: number | null;
  position: number;
}

export interface Attempt {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  createdAt: string;
}

export interface Progress {
  completed: number;
  total: number;
  percent: number;
  quizPassed: boolean;
  bestPercent: number | null;
  certificateEligible: boolean;
}

export interface CourseSummary {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnailUrl: string | null;
  liveClassAt: string | null;
  createdAt: string;
  instructor: { id: string; name: string };
  lessonCount: number;
  enrollmentCount: number;
  quiz: QuizMeta | null;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnailUrl: string | null;
  liveClassAt: string | null;
  createdAt: string;
  instructor: { id: string; name: string };
  enrollmentCount: number;
  lessons: Lesson[];
  quiz: QuizMeta | null;
}

export interface Viewer {
  enrollment: { id: string; enrolledAt: string; paymentRef: string | null } | null;
  completedLessonIds: string[];
  isOwner: boolean;
  canManage: boolean;
  progress: Progress;
  bestAttempt: Attempt | null;
}

export interface CourseDetailResponse {
  course: Course;
  viewer: Viewer;
}

export interface EnrollmentItem {
  id: string;
  enrolledAt: string;
  paymentRef: string | null;
  course: {
    id: string;
    title: string;
    description: string;
    price: number;
    liveClassAt: string | null;
    instructor: { id: string; name: string };
    lessonCount: number;
    quiz: QuizMeta | null;
  };
  progress: Progress;
  nextLessonId: string | null;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
}

export interface QuizPayload {
  quiz: {
    id: string;
    title: string;
    passPercent: number;
    questions: QuizQuestion[];
  };
  bestAttempt: Attempt | null;
}

export interface QuizResult {
  attempt: {
    id: string;
    score: number;
    total: number;
    percent: number;
    passed: boolean;
    passPercent: number;
    createdAt: string;
  };
  results: {
    questionId: string;
    correctIndex: number;
    yourAnswer: number;
    correct: boolean;
  }[];
}

export interface DashboardData {
  chart: {
    courseId: string;
    title: string;
    enrollments: number;
    earnings: number;
    price: number;
    lessons: number;
    liveClassAt: string | null;
  }[];
  totals: {
    courses: number;
    lessons: number;
    enrollments: number;
    earnings: number;
    students: number;
  };
}
