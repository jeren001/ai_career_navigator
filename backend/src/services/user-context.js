export async function buildUserContext(database, userId, { skills = [], cv = null } = {}) {
  const [profileResult, assessmentResult] = await Promise.all([
    database.query(
      `SELECT id, email, display_name, country, preferred_language, age_group, education,
              work_experience, interests, skills, career_goals, is_guest
       FROM users WHERE id = $1`,
      [userId],
    ),
    database.query(
      `SELECT answers, trait_scores, recommended_roles, completed_at
       FROM quiz_sessions WHERE user_id = $1 ORDER BY completed_at DESC, id DESC LIMIT 1`,
      [userId],
    ),
  ]);

  return {
    profile: profileResult.rows[0] || null,
    latest_assessment: assessmentResult.rows[0] || null,
    skills: Array.isArray(skills) ? skills : [],
    cv: cv && typeof cv === 'object' && !Array.isArray(cv) ? cv : null,
  };
}
