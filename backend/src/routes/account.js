import { Router } from 'express';
import { clearAssessmentSessions } from './assessment.js';
import { accountMailer } from '../services/account-mail.js';
import { changeAccountPassword, confirmAccountCode, deleteAccount, limitAccountRequest, requestAccountCode } from '../services/account-security.js';
import { optionalAuthentication, requireAuthentication } from '../services/auth.js';
import { normalizeEmail, validatePassword } from '../services/profile.js';
import { skillsBody, skillsError } from '../services/user-skills.js';

export default function createAccountRouter(database, getMailer = accountMailer) {
  const router = Router();
  const authenticated = [optionalAuthentication(database), requireAuthentication];

  function action(operation) {
    return async (request, response, next) => {
      response.set('Cache-Control', 'private, no-store');
      try {
        await operation(request, response);
      } catch (error) {
        if (error.code === '23505' && error.constraint === 'users_email_unique_idx') {
          return next(skillsError(409, 'An account with this email already exists'));
        }
        return next(error);
      }
    };
  }

  const send = (purpose, args) => requestAccountCode(database, getMailer(), purpose, args);
  for (const [path, purpose] of [['email-verification', 'verify'], ['email-change', 'email_change']]) {
    router.post('/' + path + '/request', authenticated, action(async (request, response) => {
      const body = skillsBody(request.body ?? {}, purpose === 'verify' ? [] : ['email', 'current_password']);
      await limitAccountRequest(database, 'send-ip-' + purpose, request.ip, 15, 3600);
      await send(purpose, purpose === 'verify' ? { auth: request.auth } : {
        auth: request.auth, email: normalizeEmail(body.email), password: validatePassword(body.current_password),
      });
      response.status(202).json({ accepted: true });
    }));
    router.post('/' + path + '/confirm', authenticated, action(async (request, response) => {
      const { code } = skillsBody(request.body, ['code']);
      await limitAccountRequest(database, 'code-ip-' + purpose, request.ip, 40, 900);
      await confirmAccountCode(database, purpose, { auth: request.auth, code });
      response.status(204).end();
    }));
  }

  router.post('/password-reset/request', action(async (request, response) => {
    const { email, language } = skillsBody(request.body, ['email', 'language']);
    if (language !== undefined && !['en', 'zh-CN'].includes(language)) throw skillsError(400, 'language must be en or zh-CN');
    await limitAccountRequest(database, 'recovery-ip', request.ip, 15, 3600);
    await send('password_reset', { email: normalizeEmail(email), language });
    response.status(202).json({ accepted: true });
  }));
  router.post('/password-reset/confirm', action(async (request, response) => {
    const { email, code, new_password: newPassword } = skillsBody(request.body, ['email', 'code', 'new_password']);
    await limitAccountRequest(database, 'recovery-confirm-ip', request.ip, 40, 900);
    await confirmAccountCode(database, 'password_reset', {
      email: normalizeEmail(email), code, newPassword: validatePassword(newPassword),
    });
    response.status(204).end();
  }));
  router.post('/password/change', authenticated, action(async (request, response) => {
    const { current_password: password, new_password: newPassword } = skillsBody(request.body, ['current_password', 'new_password']);
    await limitAccountRequest(database, 'password-change', request.auth.userId, 10, 900);
    await changeAccountPassword(database, request.auth, validatePassword(password), newPassword);
    response.status(204).end();
  }));
  router.delete('/account', authenticated, action(async (request, response) => {
    const { current_password: password, confirmation } = skillsBody(request.body, ['current_password', 'confirmation']);
    if (confirmation !== 'DELETE') throw skillsError(400, 'Confirmation must be DELETE');
    await limitAccountRequest(database, 'delete-account', request.auth.userId, 5, 900);
    await deleteAccount(database, request.auth, validatePassword(password));
    clearAssessmentSessions(request.auth.userId);
    response.status(204).end();
  }));

  return router;
}
