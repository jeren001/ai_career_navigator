import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import pool from '../src/db/pool.js';
import { accountDigest } from '../src/services/auth.js';
import { setAiProvidersForTests, resetGeminiStateForTests } from '../src/services/assessment-ai.js';

const photo = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACAQMAAABIeJ9nAAAAA1BMVEUAAP+KeNJXAAAADElEQVQI12NgYGAAAAAEAAEnNCcKAAAAAElFTkSuQmCC', 'base64');
const password = 'initial-test-password';
const auth = '/api/auth';

test('account settings, email proof, session revocation and cascading deletion work in PostgreSQL',
  { skip: process.env.RUN_SKILLS_POSTGRES_TEST !== '1', timeout: 30_000 }, async () => {
    const email = randomUUID() + '@example.test';
    const newEmail = randomUUID() + '@example.test';
    const legacyEmail = randomUUID() + '@example.test';
    const username = 'test_' + randomUUID().slice(0, 8);
    const ids = [];
    const delivered = [];
    let mailEnabled = false;
    let server;
    try {
      setAiProvidersForTests([]);
      server = createApp(pool, { getAccountMailer: () => mailEnabled
        ? async (message) => { delivered.push(message); }
        : null }).listen(0, '127.0.0.1');
      await once(server, 'listening');
      const origin = 'http://127.0.0.1:' + server.address().port;
      async function request(path, method = 'GET', body, token, contentType) {
        const result = await fetch(origin + path, {
          method, headers: {
            ...(token && { authorization: 'Bearer ' + token }),
            ...(body !== undefined && { 'content-type': contentType ?? 'application/json' }),
          },
          body: body === undefined || contentType ? body : JSON.stringify(body),
        });
        const json = result.headers.get('content-type')?.includes('application/json');
        return { status: result.status, headers: result.headers,
          data: json ? await result.json() : Buffer.from(await result.arrayBuffer()) };
      }
      const post = (path, body, token) => request(auth + path, 'POST', body, token);
      const login = (address, value) => post('/login', { email: address, password: value });
      const readCode = (purpose, to) => {
        const message = delivered.findLast((item) => item.purpose === purpose && item.to === to);
        assert.ok(message, 'Expected a message from the test mailer');
        assert.match(message.code, /^\d{8}$/);
        return message.code;
      };

      const spec = (await request('/api-docs/openapi.json')).data;
      assert.deepEqual(spec.paths[auth + '/password-reset/request'].post.security, []);
      assert.deepEqual(spec.paths['/api/settings'].patch.security, [{ bearerAuth: [] }]);
      const { data: guest, status: guestStatus } = await post('/guest');
      assert.equal(guestStatus, 201);
      ids.push(guest.user.id);
      const assessment = await pool.query(
        "INSERT INTO quiz_sessions (user_id, answers, trait_scores, recommended_roles) VALUES ($1, '[]', '{}', '[]') RETURNING id",
        [guest.user.id],
      );
      const signup = await post('/register', {
        email, password, username: username.toUpperCase(), preferred_language: 'zh-CN',
      }, guest.access_token);
      assert.equal(signup.status, 201);
      assert.equal(signup.data.user.id, guest.user.id);
      assert.equal(signup.data.user.username, username);
      assert.equal(signup.data.user.email_verified_at, null);
      let token = signup.data.access_token;
      assert.equal((await request('/api/settings', 'GET', undefined, guest.access_token)).status, 401);
      assert.equal((await post('/register', { email: randomUUID() + '@example.test', password, username })).status, 409);

      const settings = await request('/api/settings', 'GET', undefined, token);
      assert.equal(settings.data.settings.preferred_language, 'zh-CN');
      assert.equal(settings.data.settings.privacy_settings.about_me, 'private');
      assert.equal(settings.data.settings.notification_settings.email_notifications, false);
      assert.equal((await request('/api/settings', 'PATCH', { privacy_settings: { email: 'public' } }, token)).status, 400);

      const update = await request('/api/profile', 'PATCH', {
        first_name: '小明', last_name: '王', date_of_birth: '2000-02-29',
        city: '上海', country: '中国', current_status: '学生', about_me: '学习数据分析',
      }, token);
      assert.equal(update.status, 200);
      assert.equal(update.data.profile.date_of_birth, '2000-02-29');
      assert.equal(update.data.profile.display_name, '小明 王');
      assert.equal((await request('/api/profile', 'PATCH', { date_of_birth: '2025-02-29' }, token)).status, 400);
      const publicPath = '/api/profile/public/' + username;
      assert.equal((await request(publicPath)).status, 404);
      const preferences = await request('/api/settings', 'PATCH', {
        privacy_settings: { about_me: 'public', first_name: 'public' },
        notification_settings: { career_recommendations: true, roadmap_updates: true },
      }, token);
      assert.equal(preferences.status, 200);
      assert.deepEqual((await request(publicPath)).data, { profile: { about_me: '学习数据分析', first_name: '小明' } });
      assert.equal((await request('/api/profile/photo', 'PUT', Buffer.from('plain text'), token, 'image/png')).status, 422);
      const upload = await request('/api/profile/photo', 'PUT', photo, token, 'image/png');
      assert.equal(upload.status, 200, JSON.stringify(upload.data));
      const fetched = await request('/api/profile/photo', 'GET', undefined, token);
      assert.equal(fetched.status, 200);
      assert.equal(fetched.headers.get('content-type'), 'image/jpeg');
      assert.equal(fetched.headers.get('cache-control'), 'private, no-store');
      assert.equal((await request(publicPath + '/photo')).status, 404);
      await request('/api/settings', 'PATCH', { privacy_settings: { profile_photo: 'public' } }, token);
      assert.equal((await request(publicPath + '/photo')).status, 200);
      await request('/api/settings', 'PATCH', { privacy_settings: { profile_photo: 'private' } }, token);
      assert.equal((await request(publicPath + '/photo')).status, 404);
      assert.equal((await request('/api/profile/photo', 'GET', undefined, token)).status, 200);
      assert.equal((await request('/api/profile/photo', 'DELETE', undefined, token)).status, 204);
      assert.equal((await request(publicPath + '/photo')).status, 404);
      assert.equal((await request('/api/profile/photo', 'PUT', photo, token, 'image/png')).status, 200);

      await pool.query("INSERT INTO quiz_sessions (user_id, answers, trait_scores, recommended_roles) VALUES ($1, '[]', '{}', '[]')", [guest.user.id]);
      const inbox = await request('/api/notifications', 'GET', undefined, token);
      assert.equal(inbox.data.notifications.length, 1);
      assert.match(inbox.data.notifications[0].message, /\p{Script=Han}/u);
      const notificationPath = '/api/notifications/' + inbox.data.notifications[0].id + '/read';
      assert.equal((await request(notificationPath, 'PATCH', undefined, token)).status, 204);
      assert.ok((await request('/api/notifications', 'GET', undefined, token)).data.notifications[0].read_at);

      const roadmapId = randomUUID();
      const milestoneId = randomUUID();
      await pool.query(
        "INSERT INTO roadmaps (id, user_id, language, profession, prioritized_skills, personalization, weekly_study_minutes) " +
        "VALUES ($1, $2, 'zh-CN', '{}', '[]', '{}', 60)",
        [roadmapId, guest.user.id],
      );
      await pool.query(
        "INSERT INTO roadmap_milestones (id, roadmap_id, position, title, action, outcome, estimated_minutes, resources, challenges, skill_keys) " +
        "VALUES ($1, $2, 1, 'Study', 'Read', 'Notes', 30, '[]', '[]', ARRAY[]::text[])",
        [milestoneId, roadmapId],
      );
      await pool.query('UPDATE roadmap_milestones SET completed_at = clock_timestamp() WHERE id = $1', [milestoneId]);
      const updatedInbox = await request('/api/notifications', 'GET', undefined, token);
      assert.deepEqual(updatedInbox.data.notifications.map(({ kind }) => kind),
        ['roadmap_completed', 'roadmap_created', 'career_recommendations']);

      assert.equal((await post('/email-verification/request', {}, token)).status, 503);
      mailEnabled = true;
      assert.equal((await post('/email-verification/request', {}, token)).status, 202);
      assert.equal(delivered.at(-1).language, 'zh-CN');
      const limited = await post('/email-verification/request', {}, token);
      assert.equal(limited.status, 429);
      assert.ok(Number(limited.headers.get('retry-after')) > 0);
      const code = readCode('verify', email);
      const wrong = code === '00000000' ? '10000000' : '00000000';
      assert.equal((await post('/email-verification/confirm', { code: wrong }, token)).status, 400);
      assert.equal((await post('/email-verification/confirm', { code }, token)).status, 204);
      assert.equal((await post('/email-verification/confirm', { code }, token)).status, 400);
      assert.ok((await request(auth + '/me', 'GET', undefined, token)).data.user.email_verified_at);

      assert.equal((await post('/email-change/request', { email: newEmail, current_password: 'wrong-test-password' }, token)).status, 401);
      assert.equal((await post('/email-change/request', { email: newEmail, current_password: password }, token)).status, 202);
      assert.equal((await request(auth + '/me', 'GET', undefined, token)).data.user.email, email);
      assert.equal((await post('/email-change/confirm', { code: readCode('email_change', newEmail) }, token)).status, 204);
      assert.equal((await request(auth + '/me', 'GET', undefined, token)).status, 401);
      assert.equal((await login(email, password)).status, 401);
      token = (await login(newEmail, password)).data.access_token;
      assert.ok(token);
      const changedPassword = 'changed-test-password';
      assert.equal((await post('/password/change', { current_password: password, new_password: changedPassword }, token)).status, 204);
      assert.equal((await request(auth + '/me', 'GET', undefined, token)).status, 401);
      assert.equal((await login(newEmail, password)).status, 401);
      token = (await login(newEmail, changedPassword)).data.access_token;
      assert.ok(token);

      const missing = await post('/password-reset/request', { email: randomUUID() + '@example.test' });
      const reset = await post('/password-reset/request', { email: newEmail });
      assert.equal(reset.status, 202);
      assert.deepEqual(reset.data, missing.data);
      const resetCode = readCode('password_reset', newEmail);
      const resetPassword = 'recovered-test-password';
      assert.equal((await post('/password-reset/confirm', { email: newEmail, code: resetCode, new_password: resetPassword })).status, 204);
      assert.equal((await request(auth + '/me', 'GET', undefined, token)).status, 401);
      assert.equal((await post('/password-reset/confirm', { email: newEmail, code: resetCode, new_password: resetPassword })).status, 400);
      token = (await login(newEmail, resetPassword)).data.access_token;
      assert.ok(token);

      const legacy = (await pool.query('INSERT INTO users (email, is_guest) VALUES ($1, TRUE) RETURNING id', [legacyEmail])).rows[0];
      ids.push(legacy.id);
      await pool.query("INSERT INTO quiz_sessions (user_id, answers, trait_scores, recommended_roles) VALUES ($1, '[]', '{}', '[]')", [legacy.id]);
      assert.equal((await post('/register', { email: legacyEmail, password })).status, 409);
      assert.equal((await post('/password-reset/request', { email: legacyEmail })).status, 202);
      const legacyCode = readCode('password_reset', legacyEmail);
      const invalid = legacyCode === '00000000' ? '10000000' : '00000000';
      for (let attempt = 0; attempt < 5; attempt += 1) {
        assert.equal((await post('/password-reset/confirm', { email: legacyEmail, code: invalid, new_password: password })).status, 400);
      }
      assert.equal((await post('/password-reset/confirm', { email: legacyEmail, code: legacyCode, new_password: password })).status, 400);
      await pool.query("UPDATE account_request_limits SET window_end = clock_timestamp() WHERE scope = 'send-cooldown-password_reset' AND subject = $1",
        [accountDigest('request-limit', legacy.id)]);
      assert.equal((await post('/password-reset/request', { email: legacyEmail })).status, 202);
      const secondCode = readCode('password_reset', legacyEmail);
      await pool.query('UPDATE account_email_codes SET expires_at = clock_timestamp() WHERE user_id = $1', [legacy.id]);
      assert.equal((await post('/password-reset/confirm', { email: legacyEmail, code: secondCode, new_password: password })).status, 400);
      await pool.query("UPDATE account_request_limits SET window_end = clock_timestamp() WHERE scope = 'send-cooldown-password_reset' AND subject = $1",
        [accountDigest('request-limit', legacy.id)]);
      assert.equal((await post('/password-reset/request', { email: legacyEmail })).status, 202);
      assert.equal((await post('/password-reset/confirm', { email: legacyEmail, code: readCode('password_reset', legacyEmail), new_password: password })).status, 204);
      assert.equal((await login(legacyEmail, password)).data.user.id, legacy.id);
      assert.equal((await pool.query('SELECT 1 FROM quiz_sessions WHERE user_id = $1', [legacy.id])).rowCount, 1);

      assert.equal((await request(auth + '/account', 'DELETE', { current_password: resetPassword, confirmation: 'DELETE' }, token)).status, 204);
      assert.equal((await request(auth + '/me', 'GET', undefined, token)).status, 401);
      assert.equal((await request(publicPath)).status, 404);
      assert.equal((await pool.query('SELECT 1 FROM quiz_sessions WHERE id = $1', [assessment.rows[0].id])).rowCount, 0);
      assert.equal((await pool.query('SELECT 1 FROM user_notifications WHERE user_id = $1', [guest.user.id])).rowCount, 0);
      assert.equal((await pool.query('SELECT 1 FROM roadmap_milestones WHERE id = $1', [milestoneId])).rowCount, 0);
    } finally {
      resetGeminiStateForTests();
      if (server) await new Promise((resolve) => server.close(resolve));
      await pool.query('DELETE FROM users WHERE id = ANY($1::integer[])', [ids]);
      await pool.query('DELETE FROM account_request_limits WHERE subject = ANY($1::bytea[])', [
        [...ids, email, newEmail, legacyEmail, '127.0.0.1'].map((subject) => accountDigest('request-limit', subject)),
      ]);
      await pool.end();
    }
  });
