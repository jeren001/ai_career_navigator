import express, { Router } from 'express';
import { optionalAuthentication, requireAuthentication } from '../services/auth.js';
import { normalizeUsername, profileColumns, profileUpdateSql, publicProfile, validateProfileUpdate } from '../services/profile.js';
import { normalizeProfilePhoto, photoFormats, photoLimit } from '../services/profile-photo.js';
import { privacyFields } from '../services/settings.js';
import { skillsError } from '../services/user-skills.js';

function sendPhoto(response, bytes) {
  if (!bytes) throw skillsError(404, 'Profile photo not found');
  response.type('image/jpeg').set('X-Content-Type-Options', 'nosniff').send(bytes);
}

export default function createProfileRouter(database) {
  const router = Router();
  router.use((request, response, next) => {
    response.set('Cache-Control', 'private, no-store');
    next();
  });

  router.get('/public/:username/photo', async (request, response, next) => {
    try {
      const { rows: [row] } = await database.query(
        "SELECT profile_photo FROM users WHERE username = $1 AND NOT is_guest AND privacy_settings->>'profile_photo' = 'public'",
        [normalizeUsername(request.params.username)],
      );
      sendPhoto(response, row?.profile_photo);
    } catch (error) {
      next(error);
    }
  });

  router.get('/public/:username', async (request, response, next) => {
    try {
      const { rows: [row] } = await database.query(
        'SELECT username, first_name, last_name, country, city, current_status, career_goals, about_me, ' +
        'privacy_settings, profile_photo IS NOT NULL AS has_profile_photo FROM users WHERE username = $1 AND NOT is_guest',
        [normalizeUsername(request.params.username)],
      );
      if (!row) throw skillsError(404, 'Public profile not found');
      const profile = {};
      for (const field of privacyFields) {
        if (row.privacy_settings[field] !== 'public') continue;
        if (field === 'profile_photo') {
          if (row.has_profile_photo) profile.profile_photo_url = '/api/profile/public/' + row.username + '/photo';
        } else if (row[field] != null) {
          profile[field] = row[field];
        }
      }
      if (!Object.keys(profile).length) throw skillsError(404, 'Public profile not found');
      response.json({ profile });
    } catch (error) {
      next(error);
    }
  });

  router.use(optionalAuthentication(database), requireAuthentication);

  router.get('/', async (request, response, next) => {
    try {
      const { rows: [row] } = await database.query(
        'SELECT ' + profileColumns + ' FROM users WHERE id = $1', [request.auth.userId],
      );
      if (!row) throw skillsError(404, 'User not found');
      response.json({ profile: publicProfile(row) });
    } catch (error) {
      next(error);
    }
  });

  router.patch('/', async (request, response, next) => {
    try {
      const update = profileUpdateSql(request.auth.userId, validateProfileUpdate(request.body));
      const { rows: [row] } = await database.query(update.text, update.values);
      if (!row) throw skillsError(404, 'User not found');
      response.json({ profile: publicProfile(row) });
    } catch (error) {
      if (error.code === '23505' && error.constraint === 'users_username_unique_idx') {
        return next(skillsError(409, 'Username is already taken'));
      }
      return next(error);
    }
  });

  router.get('/photo', async (request, response, next) => {
    try {
      const { rows: [row] } = await database.query('SELECT profile_photo FROM users WHERE id = $1', [request.auth.userId]);
      sendPhoto(response, row?.profile_photo);
    } catch (error) {
      next(error);
    }
  });

  router.put('/photo', express.raw({ type: Object.keys(photoFormats), limit: photoLimit, inflate: false }),
    async (request, response, next) => {
      try {
        const mediaType = Object.keys(photoFormats).find((type) => request.is(type));
        const image = await normalizeProfilePhoto(request.body, mediaType);
        const { rowCount } = await database.query(
          'UPDATE users SET profile_photo = $2 WHERE id = $1 AND session_version = $3',
          [request.auth.userId, image, request.auth.version],
        );
        if (!rowCount) throw skillsError(401, 'Invalid bearer token');
        response.json({ profile_photo_url: '/api/profile/photo' });
      } catch (error) {
        next(error);
      }
    });

  router.delete('/photo', async (request, response, next) => {
    try {
      await database.query('UPDATE users SET profile_photo = NULL WHERE id = $1', [request.auth.userId]);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });
  return router;
}
