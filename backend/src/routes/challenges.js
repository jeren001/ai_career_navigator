import { Router } from 'express';
import { optionalAuthentication, requireAuthentication } from '../services/auth.js';
import { catalogLanguage, challengeDetail, discoverChallenges } from '../services/challenge-catalog.js';
import { challengeProgress, evaluateSubmission, getSubmission, submitChallenge } from '../services/practical-challenges.js';
import { skillsError } from '../services/user-skills.js';

function submissionId(value) {
  if (!/^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i.test(value)) {
    throw skillsError(400, 'Submission ID must be a UUID');
  }
  return value;
}

export default function createChallengesRouter(database) {
  const router = Router();
  const account = [optionalAuthentication(database), requireAuthentication];

  router.get('/', (request, response) => response.json(discoverChallenges(request.query)));

  router.get('/progress', account, async (request, response, next) => {
    try {
      return response.json({ progress: await challengeProgress(database, request.auth.userId) });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/submissions/:id', account, async (request, response, next) => {
    try {
      const submission = await getSubmission(database, request.auth.userId, submissionId(request.params.id));
      return response.json({ submission });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/submissions/:id/evaluate', account, async (request, response, next) => {
    try {
      const submission = await evaluateSubmission(database, request.auth.userId, submissionId(request.params.id));
      return response.status(submission.status === 'evaluating' ? 202 : 200).json({ submission });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/:id', (request, response) => response.json(
    challengeDetail(request.params.id, catalogLanguage(request.query.language)),
  ));

  router.post('/:id/submissions', account, async (request, response, next) => {
    try {
      const submission = await submitChallenge(database, request.auth.userId, request.params.id, request.body);
      return response.status(201).json({ submission });
    } catch (error) {
      return next(error);
    }
  });

  router.use((error, request, response, next) => {
    if (error.code === '42P01' || error.code === '42703') {
      return response.status(503).json({ error: 'Practical challenges database schema is out of date' });
    }
    return next(error);
  });

  return router;
}
