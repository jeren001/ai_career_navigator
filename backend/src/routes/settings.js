import { Router } from 'express';
import { optionalAuthentication, requireAuthentication } from '../services/auth.js';
import { getSettings, listNotifications, markNotificationRead, updateSettings } from '../services/settings.js';
import { skillsError } from '../services/user-skills.js';

export default function createSettingsRouter(database) {
  const router = Router();
  function action(operation) {
    return [optionalAuthentication(database), requireAuthentication, async (request, response, next) => {
      try {
        response.set('Cache-Control', 'private, no-store');
        await operation(request, response, request.auth.userId);
      } catch (error) {
        next(error);
      }
    }];
  }

  router.get('/settings', action(async (request, response, userId) => {
    response.json({ settings: await getSettings(database, userId) });
  }));
  router.patch('/settings', action(async (request, response, userId) => {
    response.json({ settings: await updateSettings(database, userId, request.body) });
  }));
  router.get('/notifications', action(async (request, response, userId) => {
    const before = request.query.before === undefined ? null : notificationId(request.query.before);
    response.json(await listNotifications(database, userId, before));
  }));
  router.patch('/notifications/:id/read', action(async (request, response, userId) => {
    await markNotificationRead(database, userId, notificationId(request.params.id));
    response.status(204).end();
  }));
  return router;
}

function notificationId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || Number(value) > 2_147_483_647) {
    throw skillsError(400, 'Notification ID must be a positive integer');
  }
  return Number(value);
}
