import { skillsBody, skillsError } from './user-skills.js';

export const privacyFields = [
  'profile_photo', 'first_name', 'last_name', 'username', 'country', 'city', 'current_status', 'career_goals', 'about_me',
];
export const notificationFields = [
  'career_recommendations', 'job_alerts', 'learning_reminders', 'roadmap_updates', 'platform_updates', 'email_notifications',
];
const notificationCopy = {
  career_recommendations: ['Your career recommendations are ready.', '你的职业推荐已生成。'],
  roadmap_created: ['Your career roadmap is ready.', '你的职业路线图已生成。'],
  roadmap_completed: ['You completed a roadmap milestone.', '你已完成一个路线图里程碑。'],
};

const settingsColumns = 'preferred_language, privacy_settings, notification_settings';

function defaultSettings(keys, value, saved) {
  return Object.fromEntries(keys.map((key) => [key, saved[key] ?? value]));
}

export function settingsResponse(row) {
  if (!row) throw skillsError(404, 'User not found');
  return {
    preferred_language: row.preferred_language,
    privacy_settings: defaultSettings(privacyFields, 'private', row.privacy_settings),
    notification_settings: defaultSettings(notificationFields, false, row.notification_settings),
  };
}

export async function getSettings(database, userId) {
  const { rows: [row] } = await database.query('SELECT ' + settingsColumns + ' FROM users WHERE id = $1', [userId]);
  return settingsResponse(row);
}

export async function updateSettings(database, userId, raw) {
  const { preferred_language: language, privacy_settings: privacy, notification_settings: notifications } =
    skillsBody(raw, ['preferred_language', 'privacy_settings', 'notification_settings']);
  if (!Object.keys(raw).length) throw skillsError(400, 'Supply at least one settings field');
  if (language !== undefined && !['en', 'zh-CN'].includes(language)) throw skillsError(400, 'language must be en or zh-CN');
  if (privacy !== undefined && Object.values(skillsBody(privacy, privacyFields)).some((value) => !['public', 'private'].includes(value))) {
    throw skillsError(400, 'Privacy settings must be public or private');
  }
  if (notifications !== undefined && Object.values(skillsBody(notifications, notificationFields)).some((value) => typeof value !== 'boolean')) {
    throw skillsError(400, 'Notification settings must be booleans');
  }
  const { rows: [row] } = await database.query(
    'UPDATE users SET preferred_language = COALESCE($2, preferred_language), ' +
    'privacy_settings = privacy_settings || $3::jsonb, notification_settings = notification_settings || $4::jsonb ' +
    'WHERE id = $1 RETURNING ' + settingsColumns,
    [userId, language ?? null, JSON.stringify(privacy ?? {}), JSON.stringify(notifications ?? {})],
  );
  return settingsResponse(row);
}

export async function listNotifications(database, userId, before) {
  const { rows } = await database.query(
    'SELECT n.id, n.kind, n.related_id, n.created_at, n.read_at, u.preferred_language FROM user_notifications n ' +
    'JOIN users u ON u.id = n.user_id WHERE n.user_id = $1 AND ($2::integer IS NULL OR n.id < $2) ' +
    'ORDER BY n.id DESC LIMIT 21', [userId, before],
  );
  return {
    notifications: rows.slice(0, 20).map(({ preferred_language, ...row }) => ({
      ...row, message: notificationCopy[row.kind][Number(preferred_language === 'zh-CN')],
    })),
    next_before: rows.length > 20 ? rows[19].id : null,
  };
}

export async function markNotificationRead(database, userId, id) {
  const { rowCount } = await database.query(
    'UPDATE user_notifications SET read_at = COALESCE(read_at, clock_timestamp()) WHERE user_id = $1 AND id = $2', [userId, id],
  );
  if (!rowCount) throw skillsError(404, 'Notification not found');
}
