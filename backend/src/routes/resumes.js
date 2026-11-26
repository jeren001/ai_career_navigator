import express, { Router } from 'express';
import { optionalAuthentication, requireAuthentication } from '../services/auth.js';
import { resumeAdvice } from '../services/resume-ai.js';
import { resumeFileLimit, resumeMediaTypes } from '../services/resume-extraction.js';
import {
  createResume, deleteResume, downloadResume, listResumes, readResume, resumeUuid, updateResume,
} from '../services/resumes.js';
import { skillsBody, skillsError } from '../services/user-skills.js';

export default function createResumesRouter(database) {
  const router = Router();
  router.use((request, response, next) => {
    response.set('Cache-Control', 'private, no-store');
    next();
  }, optionalAuthentication(database), requireAuthentication);
  // Allow larger structured resumes than the application's default JSON parser.
  router.use(express.json({ limit: '512kb' }));
  router.param('id', (request, response, next, id) => {
    try {
      resumeUuid(id);
      next();
    } catch (error) {
      next(error);
    }
  });

  router.get('/', async (request, response, next) => {
    try {
      const offset = request.query.offset ?? '0';
      if (typeof offset !== 'string' || !/^\d+$/.test(offset) || Number(offset) > 2_147_483_647) {
        throw skillsError(400, 'offset must be a nonnegative integer');
      }
      response.json(await listResumes(database, request.auth.userId, Number(offset)));
    } catch (error) {
      next(error);
    }
  });

  router.post('/', async (request, response, next) => {
    try {
      response.status(201).json({ resume: await createResume(database, request.auth.userId, request.body) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/upload', express.raw({ limit: resumeFileLimit, type: Object.keys(resumeMediaTypes), inflate: false }),
    async (request, response, next) => {
      try {
        const mediaType = Object.keys(resumeMediaTypes).find((type) => request.is(type));
        if (!mediaType) throw skillsError(415, 'Upload a PDF or DOCX file with its document content type');
        const resume = await createResume(database, request.auth.userId, request.query, { buffer: request.body, mediaType });
        response.status(201).json({ resume });
      } catch (error) {
        next(error);
      }
    });

  router.get('/:id', async (request, response, next) => {
    try {
      response.json({ resume: await readResume(database, request.auth.userId, request.params.id) });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/:id', async (request, response, next) => {
    try {
      response.json({ resume: await updateResume(database, request.auth.userId, request.params.id, request.body) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id/file', async (request, response, next) => {
    try {
      const file = await downloadResume(database, request.auth.userId, request.params.id);
      response
        .attachment('resume.' + resumeMediaTypes[file.file_media_type])
        .type(file.file_media_type)
        .set('X-Content-Type-Options', 'nosniff')
        .send(file.file_content);
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/analyze', async (request, response, next) => {
    try {
      const { consent, target_role: target } = skillsBody(request.body, ['consent', 'target_role']);
      if (consent !== true) throw skillsError(400, 'Resume analysis requires explicit consent to AI processing');
      if (target !== undefined && (typeof target !== 'string' || !target.trim() || target.includes('\0') || target.length > 120)) {
        throw skillsError(400, 'target_role must be nonempty text of at most 120 characters');
      }
      const resume = await readResume(database, request.auth.userId, request.params.id);
      response.json({ guidance: await resumeAdvice(database, request.auth.userId, resume, 'resume', { target_role: target?.trim() }) });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', async (request, response, next) => {
    try {
      await deleteResume(database, request.auth.userId, request.params.id);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.use((error, request, response, next) => {
    if (error.code === '42P01' || error.code === '42703') {
      return response.status(503).json({ error: 'My Resume database schema is out of date' });
    }
    return next(error);
  });
  return router;
}
