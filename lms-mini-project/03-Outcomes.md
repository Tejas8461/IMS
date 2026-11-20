# Outcomes

## What you will have at the end
- A working mini LMS: instructor creates courses and lessons, student enrolls, watches, takes a quiz, and downloads a certificate
- Role-based login (student / instructor)
- Progress tracking with auto-graded quiz
- Instructor dashboard with a Chart.js enrollment/earnings chart
- Live class access through a Jitsi room link
- Dockerised Postgres, Prisma schema and seed script

## Submission checklist (from the brief)
- [ ] Working demo (screen recording of 3-5 minutes)
- [ ] GitHub repo with clean commits, README and setup steps
- [ ] Architecture diagram (include the *intended* BullMQ/FFmpeg/CloudFront pipeline, marked "future")
- [ ] API documentation (endpoint table)
- [ ] Test results (a few Postman/Jest tests: auth, enroll, quiz grading)
- [ ] 10-minute presentation: problem, design, challenges, results, next steps
- [ ] Individual reflection (what you learned, what you owned)

## Learning outcomes
- Designing a relational schema with Prisma (users, courses, lessons, enrollments, quiz attempts)
- JWT auth and role-based access in Express
- Building a typed React frontend against a REST API
- Generating PDFs on the server
- Scoping a large spec down to an MVP and explaining trade-offs

## Next steps (for the presentation)
Real video upload with BullMQ + FFmpeg HLS, CloudFront delivery, LiveKit live classes with chat, real payment gateway in test mode.
