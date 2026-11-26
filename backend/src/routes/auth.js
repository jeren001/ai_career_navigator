import { Router } from 'express';
import {
  createAccessToken,
  assertAuthConfigured,
  hashPassword,
  optionalAuthentication,
  requireAuthentication,
  requireAnyIdentity,
  verifyAccessToken,
  verifyPassword,
} from '../services/auth.js';
import { normalizeEmail, normalizeUsername, profileColumns, publicProfile, validatePassword, validateProfileUpdate } from '../services/profile.js';
import { limitAccountRequest } from '../services/account-security.js';

function requestError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function displayName(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.includes('\0') || value.trim().length > 120) throw requestError('display_name must be a string with at most 120 characters');
  return value.trim() || null;
}

async function createGuest(database) {
  const result = await database.query(
    `INSERT INTO users (display_name, background, is_guest)
     VALUES ('Guest', 'Career assessment participant', TRUE)
     RETURNING id, email, display_name, is_guest`,
  );
  return result.rows[0];
}

export default function createAuthRouter(database) {
  const router = Router();
  router.use(optionalAuthentication(database));

  router.post('/guest', async (request, response, next) => {
    try {
      if (request.auth) throw requestError('An identity is already active', 409);
      assertAuthConfigured();
      const user = await createGuest(database);
      return response.status(201).json({
        access_token: createAccessToken(user),
        token_type: 'Bearer',
        user: publicProfile(user),
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/register', async (request, response, next) => {
    let client;
    try {
      if (request.auth && !request.auth.isGuest) throw requestError('Account is already authenticated', 409);
      const email = normalizeEmail(request.body?.email);
      const password = validatePassword(request.body?.password);
      const name = displayName(request.body?.display_name);
      const username = normalizeUsername(request.body?.username);
      const language = request.body?.preferred_language === undefined ? null
        : validateProfileUpdate({ preferred_language: request.body.preferred_language }).preferred_language;
      assertAuthConfigured();
      await limitAccountRequest(database, 'register', request.ip, 15, 3600);
      const passwordHash = await hashPassword(password);
      client = await database.connect();
      await client.query('BEGIN');

      let result;
      if (request.auth?.isGuest) {
        result = await client.query(
          `UPDATE users
           SET email = $2, password_hash = $3, display_name = COALESCE($4, display_name),
               username = $5, preferred_language = COALESCE($6, preferred_language), is_guest = FALSE
           WHERE id = $1 AND is_guest = TRUE
           RETURNING ${profileColumns}, session_version`,
          [request.auth.userId, email, passwordHash, name, username, language],
        );
        if (result.rows.length === 0) throw requestError('Guest account is no longer available', 409);
      } else {
        result = await client.query(
          `INSERT INTO users (email, password_hash, display_name, is_guest, username, preferred_language)
           VALUES ($1, $2, $3, FALSE, $4, COALESCE($5, 'en'))
           RETURNING ${profileColumns}, session_version`,
          [email, passwordHash, name, username, language],
        );
      }

      await client.query('COMMIT');
      const user = result.rows[0];
      return response.status(201).json({ access_token: createAccessToken(user), token_type: 'Bearer', user: publicProfile(user) });
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      if (error.code === '23505') {
        error.status = 409;
        error.message = error.constraint === 'users_username_unique_idx'
          ? 'Username is already taken' : 'An account with this email already exists';
      }
      return next(error);
    } finally {
      client?.release();
    }
  });

  router.post('/login', async (request, response, next) => {
    try {
      const email = normalizeEmail(request.body?.email);
      const password = validatePassword(request.body?.password);
      assertAuthConfigured();
      await limitAccountRequest(database, 'login-ip', request.ip, 30, 900);
      await limitAccountRequest(database, 'login-email', email, 15, 900);
      const result = await database.query(
        `SELECT ${profileColumns}, password_hash, session_version
         FROM users WHERE lower(btrim(email)) = $1 AND is_guest = FALSE`,
        [email],
      );
      const user = result.rows[0];
      if (!user?.password_hash || !(await verifyPassword(password, user.password_hash))) {
        throw requestError('Email or password is incorrect', 401);
      }
      return response.json({ access_token: createAccessToken(user), token_type: 'Bearer', user: publicProfile(user) });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/transfer', requireAuthentication, async (request, response, next) => {
    let client;
    try {
      const token = request.body?.guest_access_token;
      const guest = verifyAccessToken(token);
      if (!guest.isGuest || guest.userId === request.auth.userId) throw requestError('A valid guest access token is required');
      client = await database.connect();
      await client.query('BEGIN');
      const guestResult = await client.query('SELECT id FROM users WHERE id = $1 AND is_guest = TRUE FOR UPDATE', [guest.userId]);
      if (!guestResult.rows.length) throw requestError('Guest account is no longer available', 404);
      const transfer = await client.query(
        'UPDATE quiz_sessions SET user_id = $2 WHERE user_id = $1 RETURNING id',
        [guest.userId, request.auth.userId],
      );
      await client.query('COMMIT');
      return response.json({ transferred_assessments: transfer.rows.length });
    } catch (error) {
      if (client) await client.query('ROLLBACK').catch(() => {});
      return next(error);
    } finally {
      client?.release();
    }
  });

  router.get('/me', requireAnyIdentity, async (request, response, next) => {
    try {
      const result = await database.query(
        `SELECT ${profileColumns}
         FROM users WHERE id = $1`,
        [request.auth.userId],
      );
      if (!result.rows.length) throw requestError('User not found', 404);
      return response.json({ user: publicProfile(result.rows[0]) });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
