import { Router } from 'express';
import { optionalAuthentication, requireAuthentication } from '../services/auth.js';
import { getSavedCareerMatch } from '../services/career-match.js';
import { catalogLanguage } from '../services/challenge-catalog.js';
import { latestRoadmap } from '../services/roadmaps.js';
import { MAX_QUESTIONS } from '../services/assessment.js';
import { skillsError } from '../services/user-skills.js';

const activityLabels = {
  assessment_completed: ['Career Test completed', '已完成职业测试'],
  roadmap_created: ['Roadmap created', '已创建路线图'],
  milestone_completed: ['Roadmap milestone completed', '已完成路线图里程碑'],
  challenge_submitted: ['Challenge submitted', '已提交挑战'],
  interview_evaluated: ['Interview evaluated', '已评估面试'],
  resource_completed: ['Learning resource completed', '已完成学习资源'],
};

export default function createDashboardRouter(database) {
  const router = Router();
  router.get('/', optionalAuthentication(database), requireAuthentication, async (request, response, next) => {
    try {
      const { userId } = request.auth;
      const { rows: [summary] } = await database.query(
        `SELECT preferred_language, display_name,
           (SELECT count(*)::int FROM quiz_sessions WHERE user_id = $1) AS assessments_completed,
           (SELECT count(*)::int FROM assessment_drafts WHERE user_id = $1) AS assessments_in_progress,
           (SELECT count(*)::int FROM user_skills WHERE user_id = $1) AS skills,
           (SELECT count(*)::int FROM roadmaps WHERE user_id = $1 AND archived_at IS NULL) AS active_roadmaps,
           (SELECT count(*)::int FROM practical_challenge_submissions WHERE user_id = $1) AS challenges_submitted,
           (SELECT count(*)::int FROM practical_challenge_submissions WHERE user_id = $1 AND status = 'evaluated') AS challenges_evaluated,
           (SELECT count(*)::int FROM interview_sessions WHERE user_id = $1) AS interviews_started,
           (SELECT count(*)::int FROM interview_sessions WHERE user_id = $1 AND evaluation->>'status' = 'ai') AS interviews_evaluated,
           (SELECT count(*)::int FROM learning_resource_progress WHERE user_id = $1 AND completed_at IS NOT NULL) AS resources_completed,
           (SELECT count(*)::int FROM learning_resource_progress WHERE user_id = $1 AND bookmarked_at IS NOT NULL) AS resources_bookmarked
         FROM users WHERE id = $1`, [userId],
      );
      if (!summary) throw skillsError(404, 'User not found');
      const { preferred_language, display_name, ...statistics } = summary;
      const language = catalogLanguage(request.query.language === undefined ? preferred_language : request.query.language);
      const [match, roadmap, { rows: [draft] }, { rows: activity }] = await Promise.all([
        getSavedCareerMatch(database, userId),
        latestRoadmap(database, userId),
        database.query(
          `SELECT id AS assessment_id, state->>'language' AS language,
                  jsonb_array_length(state->'answers') AS answered
           FROM assessment_drafts WHERE user_id = $1 ORDER BY updated_at DESC, id DESC LIMIT 1`, [userId],
        ),
        database.query(
          `SELECT kind, item_id, occurred_at FROM (
             SELECT 'assessment_completed' AS kind, id::text AS item_id, completed_at AS occurred_at
             FROM quiz_sessions WHERE user_id = $1
             UNION ALL
             SELECT 'roadmap_created', id::text, created_at FROM roadmaps WHERE user_id = $1
             UNION ALL
             SELECT 'milestone_completed', m.id::text, m.completed_at
             FROM roadmap_milestones m JOIN roadmaps r ON r.id = m.roadmap_id
             WHERE r.user_id = $1 AND m.completed_at IS NOT NULL
             UNION ALL
             SELECT 'challenge_submitted', id::text, created_at FROM practical_challenge_submissions WHERE user_id = $1
             UNION ALL
             SELECT 'interview_evaluated', id::text, updated_at
             FROM interview_sessions WHERE user_id = $1 AND evaluation->>'status' = 'ai'
             UNION ALL
             SELECT 'resource_completed', resource_id, completed_at
             FROM learning_resource_progress WHERE user_id = $1 AND completed_at IS NOT NULL
           ) AS activity ORDER BY occurred_at DESC, kind, item_id DESC LIMIT 10`, [userId],
        ),
      ]);
      response.set('Cache-Control', 'private, no-store').json({
        language, display_name, statistics,
        progress: {
          assessment: draft ? { ...draft, target: MAX_QUESTIONS } : null,
          roadmap: roadmap ? { id: roadmap.id, profession: roadmap.profession, ...roadmap.progress } : null,
        },
        recommendations: match ? {
          assessment_session_id: match.assessment_session_id,
          language: match.language,
          professions: match.professions.slice(0, 3),
        } : null,
        recent_activity: activity.map((event) => ({
          ...event, label: activityLabels[event.kind][Number(language === 'zh-CN')],
        })),
      });
    } catch (error) {
      next(error);
    }
  });
  return router;
}
