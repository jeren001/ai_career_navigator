import { randomUUID, timingSafeEqual } from 'node:crypto';
import { inputText } from './account-input.js';
import { accountDigest } from './auth.js';
import { catalogLanguage } from './challenge-catalog.js';
import { evaluateCvWithAi, recommendationCopy } from './cv-analysis-ai.js';
import { cvChecks } from './cv-analysis-checks.js';
import { cvEvidence, sections } from './cv-analysis-evidence.js';
import { rubric, rubricVersion, scoreAnalysis } from './cv-analysis-rubric.js';
import { skillsBody, skillsError } from './user-skills.js';

export const careerLevels = ['student', 'fresh_graduate', 'entry_level', 'mid_level', 'senior_level', 'executive'];
export const cvSettings = ['language', 'target_job_title', 'industry', 'specialization', 'career_level', 'target_country'];
export const cvAnalysisFields = [...cvSettings, 'consent', 'save'];

export function cvAnalysisInput(raw, query = false) {
  const input = skillsBody(raw, cvAnalysisFields);
  const parseFlag = (field) => {
    const value = input[field];
    if (value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (query && (value === 'true' || value === 'false')) return value === 'true';
    throw skillsError(400, field + ' must be a boolean');
  };
  const settings = {};
  for (const field of cvSettings) {
    if (input[field] === undefined) continue;
    settings[field] = inputText(input[field], field, 120);
  }
  if (settings.language !== undefined) catalogLanguage(settings.language);
  if (settings.career_level && !careerLevels.includes(settings.career_level)) {
    throw skillsError(400, 'Invalid career_level');
  }
  if (settings.target_country && !/^[A-Z]{2}$/.test(settings.target_country)) {
    throw skillsError(400, 'target_country must be a two-letter uppercase country code');
  }
  return { settings, consent: parseFlag('consent'), save: parseFlag('save') };
}

const fallbackCopy = {
  ats_contact: ['Add a contact method the parser can detect.', '添加解析器可识别的联系方式。'],
  ats_sections: ['Use recognizable section headings for the content you include.', '为已有内容使用易于识别的章节标题。'],
  review: ['Review the evidence and check that the CV describes your own contributions clearly.', '请核对证据，并清楚描述你自己的贡献。'],
};
const limitations = {
  ats_estimate: ['ATS compatibility is an estimate based on the checks shown.', 'ATS 兼容性是根据所列检查得出的估计。'],
  pdf_scope: ['PDF text extraction covers up to the first 30 pages.', 'PDF 文本提取最多覆盖前 30 页。'],
  excerpt_scope: ['Semantic evaluation uses bounded, redacted excerpts.', '语义评估使用经过脱敏且长度有限的摘录。'],
  excerpts_truncated: ['Some content exceeded the excerpt limits or was outside selected sections.', '部分内容超出摘录限制或未包含在选定章节中。'],
  incomplete_scoring: ['Unavailable criteria are listed separately. A partial score describes the observed criteria only.', '无法评估的指标单独列出。部分评分仅描述已评估的指标。'],
  ai_unavailable: ['Semantic checks are limited to validated provider results.', '语义检查仅使用通过验证的模型结果。'],
  market_conventions_not_verified: ['Country is supplied as context. Local recruitment conventions lack a verified scoring rubric.', '目标国家仅用作背景。当地招聘惯例缺少经过验证的评分标准。'],
};
const pageSize = 20;

export async function analyzeCv(database, userId, resume, input) {
  const settings = { ...input.settings, language: input.settings.language ?? resume.language };
  const locale = Number(settings.language === 'zh-CN');
  const view = cvEvidence(resume);
  const checks = cvChecks(resume, view, settings);
  const ai = input.consent && view.evidence.length
    ? await evaluateCvWithAi(database, userId, settings, view.evidence)
    : { status: 'skipped', reason: input.consent ? 'no_evidence' : 'consent_not_given' };
  const criteria = Object.fromEntries(rubric.flatMap(([, , definitions]) => definitions.map(([id]) =>
    [id, checks[id] ?? ai.criteria?.[id] ?? {
      status: 'unavailable', source: 'ai', points: null, reason: ai.status === 'ai' ? 'insufficient_evidence' : ai.reason,
    }],
  )));
  const scores = scoreAnalysis(criteria, settings.language);
  const recommendations = (ai.recommendations ?? []).map(({ code, evidence_id, priority }) => {
    const excerpt = view.evidence[evidence_id - 1];
    const [issue, improvement, template] = recommendationCopy[code][locale];
    return {
      code, priority, source: 'ai', section: excerpt.section, issue, explanation: issue,
      improvement, evidence_id, original_content: excerpt.text, suggested_revision: template ?? null,
      ...(template && { revision_is_template: true }),
    };
  });
  const codes = [];
  if (!view.hasContact) codes.push(['ats_contact', 'personal_information']);
  if (checks.section_identification.points < 20) codes.push(['ats_sections', 'other']);
  if (!recommendations.length && !codes.length) codes.push(['review', 'other']);
  for (const [code, section] of codes) recommendations.push({
    code, section, priority: code === 'ats_contact' ? 'high' : 'medium',
    source: 'rule_based', improvement: fallbackCopy[code][locale],
    original_content: null, suggested_revision: null,
  });
  const observed = scores.categories.flatMap(({ criteria: items }) => items.filter(({ status }) => status === 'scored'));
  const finding = ({ id, source, points, max_points, evidence_ids, explanation }) => ({
    criterion_id: id, source, points, max_points, evidence_ids: evidence_ids ?? [], ...(explanation && { explanation }),
  });
  const issue = (!view.hasContact) ? [{
    code: 'ats_contact', source: 'rule_based',
    message: ['No email or phone number was detected.', '未识别到电子邮箱或电话号码。'][locale],
  }] : [];
  const limitationCodes = ['ats_estimate', 'incomplete_scoring'];
  if (resume.file_media_type === 'application/pdf') limitationCodes.push('pdf_scope');
  if (input.consent) limitationCodes.push('excerpt_scope');
  if (view.limited) limitationCodes.push('excerpts_truncated');
  if (ai.status !== 'ai') limitationCodes.push('ai_unavailable');
  if (settings.target_country) limitationCodes.push('market_conventions_not_verified');
  return {
    rubric_version: rubricVersion, settings,
    ...scores,
    evaluation_summary: scores.overall.score === null
      ? ['Available checks are shown by category. There is insufficient evidence for an overall score.', '各类别显示可用检查。现有证据不足以计算总分。'][locale]
      : ['The weighted score combines the available category evaluations.', '加权总分综合了各类别的可用评估。'][locale],
    source: { mode: resume.id ? 'saved_resume' : 'upload', media_type: resume.file_media_type ?? null },
    document_observations: resume.layout ?? null,
    ai: { consent: input.consent, status: ai.status, ...(ai.provider && { provider: ai.provider }), ...(ai.reason && { reason: ai.reason }) },
    limitations: limitationCodes.map((code) => ({ code, message: limitations[code][locale] })),
    strengths: observed.filter(({ points, max_points }) => points / max_points >= 0.8).map(finding),
    areas_for_improvement: observed.filter(({ points, max_points }) => points / max_points < 0.6).map(finding),
    critical_issues: issue,
    evidence: view.evidence,
    sections: sections.map((section) => {
      const ids = view.evidence.filter((item) => item.section === section).map(({ id }) => id);
      return {
        id: section, status: view.sections.has(section) || ids.length ? 'detected' : 'not_detected',
        evidence_ids: ids, findings: observed.filter((item) => item.evidence_ids?.some((id) => ids.includes(id))).map(finding),
        recommendation_codes: recommendations.filter((item) => item.section === section).map(({ code }) => code),
      };
    }),
    recommendations,
  };
}

export async function saveCvAnalysis(database, userId, resumeId, report) {
  const { rows: [saved] } = await database.query(
    `WITH saved AS (
       INSERT INTO cv_analysis_reports (id, user_id, resume_id, report, ai_consent)
       SELECT $1, u.id, $3, $4, $5 FROM users u
       WHERE u.id = $2 AND NOT u.is_guest
         AND ($3::uuid IS NULL OR EXISTS (SELECT 1 FROM resumes r WHERE r.id = $3 AND r.user_id = u.id))
       RETURNING id, user_id, resume_id, created_at, report
     ), notification AS (
       INSERT INTO user_notifications (user_id, kind, related_id)
       SELECT saved.user_id, 'cv_analysis_completed', saved.id::text FROM saved
       JOIN users u ON saved.user_id = u.id
       WHERE u.notification_settings -> 'cv_analysis_completed' = 'true'::jsonb
     )
     SELECT id, resume_id, created_at, report FROM saved`,
    [randomUUID(), userId, resumeId, JSON.stringify(report), report.ai.consent],
  ).catch((error) => {
    if (error.code === '23503') throw skillsError(404, 'Resume or account no longer exists');
    throw error;
  });
  if (!saved) throw skillsError(404, 'Resume or account no longer exists');
  return saved;
}

export function cvSaveToken(userId, resumeId, report) {
  const expires = Date.now() + 30 * 60_000;
  return expires + '.' + accountDigest('cv-analysis-preview', userId, resumeId, expires, report).toString('base64url');
}

export function verifyCvSaveToken(userId, resumeId, report, token) {
  if (typeof token !== 'string' || !/^\d{13}\.[\w-]{43}$/.test(token)) {
    throw skillsError(400, 'Invalid or expired CV analysis preview');
  }
  const [timestamp, signature] = token.split('.');
  const expires = Number(timestamp);
  const expected = accountDigest('cv-analysis-preview', userId, resumeId, expires, report).toString('base64url');
  if (expires <= Date.now() || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw skillsError(400, 'Invalid or expired CV analysis preview');
  }
}

export async function listCvAnalyses(database, userId, offset) {
  const { rows } = await database.query(
    `SELECT id, resume_id, created_at, report->'overall' AS overall,
            report->'settings' AS settings, report->>'rubric_version' AS rubric_version
     FROM cv_analysis_reports WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3`,
    [userId, pageSize + 1, offset],
  );
  return { reports: rows.slice(0, pageSize), next_offset: rows.length > pageSize ? offset + pageSize : null };
}

export async function readCvAnalysis(database, userId, id) {
  const { rows: [saved] } = await database.query(
    'SELECT id, resume_id, created_at, report FROM cv_analysis_reports WHERE user_id = $1 AND id = $2', [userId, id],
  );
  if (!saved) throw skillsError(404, 'CV analysis report not found');
  return saved;
}

export async function deleteCvAnalysis(database, userId, id) {
  const { rowCount } = await database.query('DELETE FROM cv_analysis_reports WHERE user_id = $1 AND id = $2', [userId, id]);
  if (!rowCount) throw skillsError(404, 'CV analysis report not found');
}
