import { randomInt, timingSafeEqual } from 'node:crypto';
import { accountDigest, hashPassword, verifyPassword } from './auth.js';
import { normalizeEmail, validatePassword } from './profile.js';
import { skillsError } from './user-skills.js';

export async function limitAccountRequest(database, scope, subject, max, seconds, { silent = false } = {}) {
  const digest = accountDigest('request-limit', subject);
  const { rowCount } = await database.query(
    'INSERT INTO account_request_limits (scope, subject, window_end, request_count) ' +
    'VALUES ($1, $2, clock_timestamp() + make_interval(secs => $4), 1) ' +
    'ON CONFLICT (scope, subject) DO UPDATE SET ' +
    'window_end = CASE WHEN account_request_limits.window_end <= clock_timestamp() THEN EXCLUDED.window_end ELSE account_request_limits.window_end END, ' +
    'request_count = CASE WHEN account_request_limits.window_end <= clock_timestamp() THEN 1 ELSE account_request_limits.request_count + 1 END ' +
    'WHERE account_request_limits.window_end <= clock_timestamp() OR account_request_limits.request_count < $3',
    [scope, digest, max, seconds],
  );
  if (!rowCount && !silent) {
    const { rows: [window] } = await database.query(
      'SELECT GREATEST(1, ceil(extract(epoch FROM window_end - clock_timestamp())))::integer AS retry_after ' +
      'FROM account_request_limits WHERE scope = $1 AND subject = $2',
      [scope, digest],
    );
    const error = skillsError(429, 'Too many requests. Try again later');
    error.retryAfter = window?.retry_after ?? 1;
    throw error;
  }
  return rowCount > 0;
}

async function transaction(database, operation) {
  const client = await database.connect();
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function lockUser(client, auth, email) {
  const columns = 'id, email, email_verified_at, password_hash, preferred_language, session_version, is_guest';
  const { rows: [user] } = auth
    ? await client.query('SELECT ' + columns + ' FROM users WHERE id = $1 AND NOT is_guest FOR UPDATE', [auth.userId])
    : await client.query(
      'SELECT ' + columns + ' FROM users WHERE lower(btrim(email)) = $1 ' +
      'AND (NOT is_guest OR password_hash IS NULL) FOR UPDATE', [email],
    );
  if (auth && (!user || user.session_version !== auth.version)) throw skillsError(401, 'Invalid bearer token');
  return user;
}

function invalidCode() {
  return skillsError(400, 'The code is invalid or expired');
}

function digestCode(user, purpose, email, code) {
  return accountDigest('account-code', user.id, user.session_version, purpose, email, code);
}

async function currentPassword(user, password) {
  if (!(await verifyPassword(password, user.password_hash))) throw skillsError(401, 'Current password is incorrect');
}

export async function requestAccountCode(database, mailer, purpose, { auth, email, password, language }) {
  if (!mailer) throw skillsError(503, 'Account email delivery is unavailable');
  const pending = await transaction(database, async (client) => {
    const user = await lockUser(client, auth, email);
    if (!user) return null;
    if (purpose === 'verify' && user.email_verified_at) throw skillsError(409, 'Email is already verified');
    const destination = purpose === 'email_change' ? email : user.email && normalizeEmail(user.email);
    if (!destination) throw skillsError(409, 'The account has no email address');
    if (purpose === 'email_change') {
      await currentPassword(user, password);
      if (user.email && destination === normalizeEmail(user.email)) throw skillsError(400, 'Enter a different email address');
      const { rowCount } = await client.query('SELECT 1 FROM users WHERE lower(btrim(email)) = $1', [destination]);
      if (rowCount) throw skillsError(409, 'An account with this email already exists');
    }
    const silent = purpose === 'password_reset';
    if (!(await limitAccountRequest(client, 'send-' + purpose, user.id, 4, 3600, { silent }))) return null;
    if (!(await limitAccountRequest(client, 'send-cooldown-' + purpose, user.id, 1, 60, { silent }))) return null;
    const code = String(randomInt(100_000_000)).padStart(8, '0');
    const digest = digestCode(user, purpose, destination, code);
    await client.query(
      'INSERT INTO account_email_codes (user_id, purpose, email, code_digest, expires_at) ' +
      "VALUES ($1, $2, $3, $4, clock_timestamp() + interval '10 minutes') " +
      'ON CONFLICT (user_id, purpose) DO UPDATE SET email = EXCLUDED.email, code_digest = EXCLUDED.code_digest, ' +
      'expires_at = EXCLUDED.expires_at, attempts = 0',
      [user.id, purpose, destination, digest],
    );
    return { userId: user.id, digest, to: destination, code, purpose, language: language ?? user.preferred_language };
  });
  if (!pending) return;
  const deliver = async () => {
    try {
      const { to, code, language } = pending;
      await mailer({ to, code, language, purpose });
    } catch {
      await database.query(
        'DELETE FROM account_email_codes WHERE user_id = $1 AND purpose = $2 AND code_digest = $3',
        [pending.userId, purpose, pending.digest],
      ).catch(() => {});
      throw skillsError(503, 'Account email delivery is unavailable');
    }
  };
  // Recovery has the same response whether an address exists or delivery succeeds.
  if (purpose === 'password_reset') void deliver().catch(() => {});
  else await deliver();
}

export async function confirmAccountCode(database, purpose, { auth, email, code, newPassword }) {
  if (typeof code !== 'string' || !/^\d{8}$/.test(code)) throw invalidCode();
  const accepted = await transaction(database, async (client) => {
    const user = await lockUser(client, auth, email);
    if (!user) return false;
    const { rows: [challenge] } = await client.query(
      'SELECT email, code_digest, attempts, expires_at > clock_timestamp() AS active FROM account_email_codes ' +
      'WHERE user_id = $1 AND purpose = $2 FOR UPDATE',
      [user.id, purpose],
    );
    if (!challenge?.active || challenge.attempts >= 5 ||
        (purpose !== 'email_change' && challenge.email !== normalizeEmail(user.email))) return false;
    const digest = digestCode(user, purpose, challenge.email, code);
    if (!timingSafeEqual(challenge.code_digest, digest)) {
      await client.query('UPDATE account_email_codes SET attempts = attempts + 1 WHERE user_id = $1 AND purpose = $2', [user.id, purpose]);
      return false;
    }

    if (purpose === 'verify') {
      await client.query('UPDATE users SET email_verified_at = clock_timestamp() WHERE id = $1', [user.id]);
      await client.query('DELETE FROM account_email_codes WHERE user_id = $1 AND purpose = $2', [user.id, purpose]);
    } else {
      if (purpose === 'email_change') {
        await client.query(
          'UPDATE users SET email = $2, email_verified_at = clock_timestamp(), session_version = session_version + 1 WHERE id = $1',
          [user.id, challenge.email],
        );
      } else {
        await client.query(
          'UPDATE users SET password_hash = $2, email_verified_at = clock_timestamp(), is_guest = FALSE, ' +
          'session_version = session_version + 1 WHERE id = $1',
          [user.id, await hashPassword(newPassword)],
        );
      }
      await client.query('DELETE FROM account_email_codes WHERE user_id = $1', [user.id]);
    }
    return true;
  });
  if (!accepted) throw invalidCode();
}

export async function changeAccountPassword(database, auth, password, newPassword) {
  validatePassword(newPassword);
  await transaction(database, async (client) => {
    const user = await lockUser(client, auth);
    await currentPassword(user, password);
    await client.query('UPDATE users SET password_hash = $2, session_version = session_version + 1 WHERE id = $1',
      [user.id, await hashPassword(newPassword)]);
    await client.query('DELETE FROM account_email_codes WHERE user_id = $1', [user.id]);
  });
}

export async function deleteAccount(database, auth, password) {
  await transaction(database, async (client) => {
    const user = await lockUser(client, auth);
    await currentPassword(user, password);
    await client.query('DELETE FROM users WHERE id = $1', [user.id]);
  });
}
