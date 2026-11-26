export async function latestCompletedAssessment(database, userId) {
  const { rows } = await database.query(
    `SELECT id, answers, trait_scores, recommended_roles, completed_at, career_match
     FROM quiz_sessions WHERE user_id = $1 ORDER BY completed_at DESC, id DESC LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function buildUserContext(database, userId, { skills = [], cv = null, loadAssessment = true } = {}) {
  const { rows: [profile] } = await database.query(
    `SELECT id, email, display_name, country, preferred_language, age_group, education,
            work_experience, interests, skills, career_goals, is_guest
     FROM users WHERE id = $1`,
    [userId],
  );

  return {
    profile: profile ?? null,
    latest_assessment: loadAssessment ? await latestCompletedAssessment(database, userId) : null,
    skills: Array.isArray(skills) ? skills : [],
    cv: cv && typeof cv === 'object' && !Array.isArray(cv) ? cv : null,
  };
}
