# Idea: "MiniLearn" – a 4-hour Mini LMS

A stripped-down online school that still touches every milestone in the brief, but at demo level.

## Core scope (build only this)
1. **Roles**: student and instructor (admin = a seeded flag, no admin UI).
2. **Courses and lessons**: instructor creates a course and adds lessons, each with a video URL (use Big Buck Bunny / Pexels sample links instead of building an upload pipeline).
3. **Enrollment**: student browses courses, enrolls, watches lessons, marks lessons complete.
4. **Quiz**: one quiz per course, MCQ, auto-graded, score saved.
5. **Progress tracking**: progress bar per enrolled course.
6. **Certificate**: when progress is 100% and quiz is passed, download a PDF certificate.
7. **Instructor dashboard**: one Chart.js chart showing enrollments (and fake "earnings" = enrollments x price) per course.

## Shortcuts for the heavy milestones (explain these in the presentation)
| Brief asks for | What you do in 4 hrs | Say in presentation |
|---|---|---|
| FFmpeg + BullMQ video conversion | Use pre-made video links | Design: upload -> BullMQ queue -> FFmpeg -> HLS; shown in the architecture diagram |
| CloudFront delivery | Direct video URL | CloudFront would sit in front of the storage bucket |
| Live classes (WebRTC/LiveKit) | A "Join live class" button opening a Jitsi Meet room link (`https://meet.jit.si/minilearn-<courseId>`) plus a scheduled-time field | Jitsi provides WebRTC and chat; LiveKit is the production upgrade |
| Payment (test mode) | "Enroll" button with a mock payment step, or Razorpay/Stripe test checkout if time remains | Test-mode only |

## Suggested time plan (about 4 hours)
- 0:00-0:30  Prisma schema, DB, seed data
- 0:30-1:30  Express APIs: auth, courses, lessons, enroll, progress
- 1:30-2:45  React pages: course list, course detail/player, quiz, dashboard
- 2:45-3:15  PDF certificate and Jitsi live link
- 3:15-4:00  README, architecture diagram, screen recording
