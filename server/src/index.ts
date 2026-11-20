import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { coursesRouter } from './routes/courses';
import { enrollmentsRouter } from './routes/enrollments';
import { quizRouter } from './routes/quiz';
import { instructorRouter } from './routes/instructor';

const app = express();
// PORT=0 means "random free port"; the demo should always answer on a known port.
const port = Number(process.env.PORT) || 4001;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN?.split(',') ?? true,
  })
);
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'minilearn-api' });
});

app.use('/api/auth', authRouter);
app.use('/api/courses', coursesRouter);
app.use('/api', enrollmentsRouter);
app.use('/api', quizRouter);
app.use('/api', instructorRouter);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(port, () => {
  console.log(`MiniLearn API listening on http://localhost:${port}`);
});
