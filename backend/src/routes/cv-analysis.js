import express, { Router } from 'express';
import { pageOffset, recordId } from '../services/account-input.js';
import {
  analyzeCv, cvAnalysisFields, cvAnalysisInput, cvSaveToken, deleteCvAnalysis, listCvAnalyses, readCvAnalysis,
  saveCvAnalysis, verifyCvSaveToken,
} from '../services/cv-analysis.js';
import { extractResumeDocument, resumeFileLimit, resumeMediaTypes } from '../services/resume-extraction.js';
import { downloadResume, readResume, resumeUuid } from '../services/resumes.js';
import { skillsBody, skillsError } from '../services/user-skills.js';

export default function createCvAnalysisRouter(database) {
  const router = Router();
  async function respond(response, userId, resume, input) {
    const report = await analyzeCv(database, userId, resume, input);
    const resumeId = resume.id ?? null;
    if (input.save) return response.status(201).json(await saveCvAnalysis(database, userId, resumeId, report));
    return response.json({
      id: null, resume_id: resumeId, created_at: null, report, save_token: cvSaveToken(userId, resumeId, report),
    });
  }

  router.post('/', async (request, response, next) => {
    try {
      const { resume_id: id, ...raw } = skillsBody(request.body, ['resume_id', ...cvAnalysisFields]);
      const input = cvAnalysisInput(raw);
      const { userId } = request.auth;
      const resume = await readResume(database, userId, resumeUuid(id));
      if (resume.file_media_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const file = await downloadResume(database, userId, resume.id);
        try {
          resume.layout = (await extractResumeDocument(file.file_content, file.file_media_type, { inspect: true })).layout;
        } catch (error) {
          if (![422, 503].includes(error.status)) throw error;
          resume.layout = null;
        }
      }
      await respond(response, userId, resume, input);
    } catch (error) {
      next(error);
    }
  });

  router.post('/upload', express.raw({ limit: resumeFileLimit, type: Object.keys(resumeMediaTypes), inflate: false }),
    async (request, response, next) => {
      try {
        const input = cvAnalysisInput(request.query, true);
        const mediaType = Object.keys(resumeMediaTypes).find((type) => request.is(type));
        const extracted = await extractResumeDocument(request.body, mediaType, { inspect: true });
        const { userId } = request.auth;
        const { rows: [user] } = await database.query('SELECT preferred_language FROM users WHERE id = $1', [userId]);
        if (!user) throw skillsError(401, 'Authentication required');
        await respond(response, userId, {
          language: user.preferred_language, sections: {}, file_media_type: mediaType,
          extracted_text: extracted.text, layout: extracted.layout,
        }, input);
      } catch (error) {
        next(error);
      }
    });

  router.post('/save', async (request, response, next) => {
    try {
      const { resume_id: id, report, save_token: token } = skillsBody(request.body, ['resume_id', 'report', 'save_token']);
      const resumeId = id === null ? null : resumeUuid(id);
      const { userId } = request.auth;
      verifyCvSaveToken(userId, resumeId, report, token);
      response.status(201).json(await saveCvAnalysis(database, userId, resumeId, report));
    } catch (error) {
      next(error);
    }
  });

  router.get('/', async (request, response, next) => {
    try {
      response.json(await listCvAnalyses(database, request.auth.userId, pageOffset(request.query.offset)));
    } catch (error) {
      next(error);
    }
  });
  router.get('/:reportId', async (request, response, next) => {
    try {
      response.json(await readCvAnalysis(database, request.auth.userId, recordId(request.params.reportId, 'reportId')));
    } catch (error) {
      next(error);
    }
  });
  router.delete('/:reportId', async (request, response, next) => {
    try {
      await deleteCvAnalysis(database, request.auth.userId, recordId(request.params.reportId, 'reportId'));
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });
  return router;
}
