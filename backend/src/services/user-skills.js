export function skillsError(status, message) {
  return Object.assign(new Error(message), { status });
}

export function skillsBody(value, allowed) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw skillsError(400, 'Request body must be an object');
  }
  const unknown = Object.keys(value).find((field) => !allowed.includes(field));
  if (unknown) throw skillsError(400, `Unsupported field: ${unknown}`);
  return value;
}

function text(value, label, maxLength, nullable = false) {
  if (nullable && value === null) return null;
  if (typeof value !== 'string' || value.includes('\0') || value.trim().length > maxLength || (!nullable && !value.trim())) {
    throw skillsError(400, `${label} must be ${nullable ? 'null or ' : 'a nonempty '}text of at most ${maxLength} characters`);
  }
  return value.trim() || null;
}

function level(value, field, nullable = false) {
  if (nullable && value === null) return null;
  if (!Number.isInteger(value) || value < 1 || value > 5) {
    throw skillsError(400, `${field} must be an integer from 1 to 5${nullable ? ' or null' : ''}`);
  }
  return value;
}

function normalize(name) {
  return name.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();
}

const aliases = new Map([
  ['structured query language', 'sql'], ['结构化查询语言', 'sql'],
  ['仪表板设计', 'dashboard design'], ['仪表盘设计', 'dashboard design'],
  ['数据可视化', 'data visualization'], ['data visualisation', 'data visualization'],
  ['网页无障碍', 'web accessibility'], ['web a11y', 'web accessibility'],
  ['用户研究', 'user research'],
]);

export function skillKey(name) {
  const key = normalize(name);
  return aliases.get(key) || key;
}

const skillColumns = `id, name, skill_key, notes, self_assessed_level, self_assessed_at,
  practical_level, practical_reference, practically_assessed_at, created_at, updated_at`;

function publicSkill(row) {
  return {
    id: row.id,
    name: row.name,
    key: row.skill_key,
    notes: row.notes,
    self_assessment: row.self_assessed_level === null ? null : {
      level: row.self_assessed_level, assessed_at: row.self_assessed_at,
    },
    practical_assessment: row.practical_level === null ? null : {
      level: row.practical_level, reference: row.practical_reference, assessed_at: row.practically_assessed_at,
    },
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// Read model shared by features that need the user's inventory and evidence provenance.
export async function listUserSkills(database, userId) {
  const { rows } = await database.query(
    `SELECT ${skillColumns} FROM user_skills WHERE user_id = $1 ORDER BY skill_key, id`,
    [userId],
  );
  return rows.map(publicSkill);
}

function skillInput(raw) {
  const body = skillsBody(raw, ['name', 'notes', 'self_assessed_level']);
  if (!Object.keys(body).length) throw skillsError(400, 'Supply at least one skill field');
  return {
    name: Object.hasOwn(body, 'name') ? text(body.name, 'name', 100) : undefined,
    notes: Object.hasOwn(body, 'notes') ? text(body.notes, 'notes', 1000, true) : undefined,
    selfLevel: Object.hasOwn(body, 'self_assessed_level') ? level(body.self_assessed_level, 'self_assessed_level', true) : undefined,
  };
}

export async function createUserSkill(database, userId, raw) {
  const { name, notes = null, selfLevel = null } = skillInput(raw);
  if (!name) throw skillsError(400, 'name is required');
  const { rows } = await database.query(
    `INSERT INTO user_skills (user_id, name, skill_key, notes, self_assessed_level, self_assessed_at)
     VALUES ($1, $2, $3, $4, $5::smallint, CASE WHEN $5 IS NOT NULL THEN CURRENT_TIMESTAMP END)
     ON CONFLICT (user_id, skill_key) DO NOTHING
     RETURNING ${skillColumns}`,
    [userId, name, skillKey(name), notes, selfLevel],
  );
  if (!rows.length) throw skillsError(409, 'This skill already exists');
  return publicSkill(rows[0]);
}

export async function updateUserSkill(database, userId, skillId, raw) {
  const { name, notes, selfLevel } = skillInput(raw);
  try {
    const { rows } = await database.query(
      `UPDATE user_skills
       SET name = COALESCE($3, name), skill_key = COALESCE($4, skill_key),
           notes = CASE WHEN $5 THEN $6 ELSE notes END,
           self_assessed_level = CASE
             WHEN $7 THEN $8::smallint WHEN $4 <> skill_key THEN NULL ELSE self_assessed_level END,
           self_assessed_at = CASE
             WHEN $7 THEN CASE WHEN $8::smallint IS NOT NULL THEN CURRENT_TIMESTAMP END
             WHEN $4 <> skill_key THEN NULL ELSE self_assessed_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND id = $2 AND ($4::text IS NULL OR $4 = skill_key OR practical_level IS NULL)
       RETURNING ${skillColumns}`,
      [userId, skillId, name ?? null, name ? skillKey(name) : null,
        notes !== undefined, notes ?? null, selfLevel !== undefined, selfLevel ?? null],
    );
    if (rows.length) return publicSkill(rows[0]);
    const existing = await database.query('SELECT 1 FROM user_skills WHERE user_id = $1 AND id = $2', [userId, skillId]);
    if (existing.rows.length) throw skillsError(409, 'A practically assessed skill cannot be renamed to a different skill');
    throw skillsError(404, 'Skill not found');
  } catch (error) {
    if (error.code === '23505') throw skillsError(409, 'This skill already exists');
    throw error;
  }
}

export async function deleteUserSkill(database, userId, skillId) {
  const { rowCount } = await database.query(
    'DELETE FROM user_skills WHERE user_id = $1 AND id = $2',
    [userId, skillId],
  );
  if (!rowCount) throw skillsError(404, 'Skill not found');
}

// Call from a trusted practical assessment workflow after it has scored the user's work.
export async function recordPracticalAssessment(database, userId, skillId, assessment) {
  const { rows } = await database.query(
    `UPDATE user_skills
     SET practical_level = $3, practical_reference = $4, practically_assessed_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $1 AND id = $2 AND skill_key = $5
     RETURNING ${skillColumns}`,
    [userId, skillId, level(assessment.level, 'level'), text(assessment.reference, 'reference', 150),
      skillKey(text(assessment.skill_name, 'skill_name', 100))],
  );
  if (!rows.length) throw skillsError(404, 'Skill not found or no longer matches the assessed skill');
  return publicSkill(rows[0]);
}
