import { Router } from 'express';
import { optionalAuthentication, requireAuthentication } from '../services/auth.js';
import { resumeAdvice } from '../services/resume-ai.js';
import { consentedResume } from '../services/resumes.js';
import {
  answerInterview, createInterview, interviewHistory, readInterview, requestInterviewEvaluation,
} from '../services/interviews.js';
import { skillsError } from '../services/user-skills.js';

export default function createInterviewsRouter(database) {
  const router = Router();
  router.use(optionalAuthentication(database), requireAuthentication);

  router.param('id', (request, response, next, id) => {
    if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(id)) {
      return next(skillsError(400, 'Interview ID must be a UUID'));
    }
    return next();
  });

  router.post('/', async (request, response, next) => {
    try {
      const session = await createInterview(database, request.auth.userId, request.body);
      return response.status(201).json({ session });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/', async (request, response, next) => {
    try {
      const offset = request.query.offset ?? '0';
      if (typeof offset !== 'string' || !/^\d+$/.test(offset) || Number(offset) > 2_147_483_647) {
        throw skillsError(400, 'offset must be a nonnegative integer');
      }
      return response.json(await interviewHistory(database, request.auth.userId, Number(offset)));
    } catch (error) {
      return next(error);
    }
  });

  router.get('/:id', async (request, response, next) => {
    try {
      const session = await readInterview(database, request.auth.userId, request.params.id);
      return response.json({ session });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/:id/answers', async (request, response, next) => {
    try {
      const session = await answerInterview(database, request.auth.userId, request.params.id, request.body);
      return response.json({ session });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/:id/evaluate', async (request, response, next) => {
    try {
      const { userId } = request.auth;
      const resume = await consentedResume(database, userId, request.body?.resume_context);
      const session = await requestInterviewEvaluation(database, userId, request.params.id);
      if (resume && !session.processing) {
        session.resume_guidance = await resumeAdvice(database, userId, resume, 'interview_simulator', {
          profession: session.profession.title,
          difficulty: session.difficulty,
        }, session.language);
        response.set('Cache-Control', 'private, no-store');
      }
      return response.status(session.processing ? 202 : 200).json({ session });
    } catch (error) {
      return next(error);
    }
  });

  router.use((error, request, response, next) => {
    if (error.code === '42P01' || error.code === '42703') {
      return response.status(503).json({ error: 'Interview database schema is out of date' });
    }
    return next(error);
  });

  return router;
}
