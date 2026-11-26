import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';

const users = [];
const assessments = [];
let nextUserId = 1;
let server;
let baseUrl;

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    is_guest: user.is_guest,
    country: user.country || null,
    preferred_language: user.preferred_language || 'en',
    age_group: user.age_group || null,
    education: user.education || null,
    work_experience: user.work_experience || null,
    interests: user.interests || [],
    skills: user.skills || [],
    career_goals: user.career_goals || null,
    created_at: user.created_at || '2026-11-25T00:00:00.000Z',
  };
}

const database = {
  async query(query, values = []) {
    if (query.startsWith('INSERT INTO account_request_limits')) return { rowCount: 1 };
    if (query.startsWith('SELECT id, is_guest, session_version FROM users')) {
      const user = users.find(({ id }) => id === values[0]);
      return { rows: user ? [{ id: user.id, is_guest: user.is_guest }] : [] };
    }
    if (query.includes('FROM users WHERE lower(btrim(email))')) {
      const user = users.find(({ email, is_guest }) => email === values[0] && !is_guest);
      return { rows: user ? [user] : [] };
    }
    if (query.includes('FROM users WHERE id = $1')) {
      const user = users.find(({ id }) => id === values[0]);
      return { rows: user ? [publicUser(user)] : [] };
    }
    if (query.startsWith('INSERT INTO users')) {
      const user = { id: nextUserId++, email: null, display_name: 'Guest', is_guest: true };
      users.push(user);
      return { rows: [user] };
    }
    if (query.startsWith('UPDATE users SET')) {
      const user = users.find(({ id }) => id === values[0]);
      if (!user) return { rows: [] };
      const assignments = query.match(/SET (.+) WHERE/)[1].split(', ');
      assignments.forEach((assignment, index) => {
        const field = assignment.split(' = ')[0];
        user[field] = values[index + 1];
      });
      return { rows: [publicUser(user)] };
    }
    throw new Error(`Unexpected query: ${query}`);
  },
  async connect() {
    return {
      async query(query, values = []) {
        if (query === 'BEGIN' || query === 'COMMIT' || query === 'ROLLBACK') return { rows: [] };
        if (query.includes('lower(btrim(email))')) {
          const user = users.find(({ email, is_guest, password_hash }) => email === values[0] && is_guest && !password_hash);
          return { rows: user ? [{ id: user.id }] : [] };
        }
        if (query.startsWith('SELECT id FROM users')) {
          const user = users.find(({ id, is_guest }) => id === values[0] && is_guest);
          return { rows: user ? [{ id: user.id }] : [] };
        }
        if (query.startsWith('INSERT INTO users')) {
          if (users.some(({ email }) => email === values[0])) {
            throw Object.assign(new Error('duplicate email'), { code: '23505', constraint: 'users_email_unique_idx' });
          }
          const user = { id: nextUserId++, email: values[0], password_hash: values[1], display_name: values[2], is_guest: false };
          users.push(user);
          return { rows: [user] };
        }
        if (query.startsWith('UPDATE users') && query.includes('password_hash')) {
          const user = users.find(({ id, is_guest }) => id === values[0] && is_guest);
          if (!user) return { rows: [] };
          const isPromotion = query.includes('email = $2');
          Object.assign(user, isPromotion
            ? { email: values[1], password_hash: values[2], display_name: values[3] || user.display_name, is_guest: false }
            : { password_hash: values[1], display_name: values[2] || user.display_name, is_guest: false });
          return { rows: [user] };
        }
        if (query.startsWith('SELECT id FROM users')) {
          const user = users.find(({ id, is_guest }) => id === values[0] && is_guest);
          return { rows: user ? [{ id: user.id }] : [] };
        }
        if (query.startsWith('UPDATE quiz_sessions')) {
          const moved = assessments.filter(({ user_id }) => user_id === values[0]);
          moved.forEach((assessment) => { assessment.user_id = values[1]; });
          return { rows: moved };
        }
        throw new Error(`Unexpected transaction query: ${query}`);
      },
      release() {},
    };
  },
};

before(async () => {
  users.length = 0;
  assessments.length = 0;
  nextUserId = 1;
  server = createApp(database).listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test('guest registration promotes the guest and keeps the assessment owner', async () => {
  const guestResponse = await fetch(`${baseUrl}/api/auth/guest`, { method: 'POST' });
  const guest = await guestResponse.json();
  const guestId = guest.user.id;
  assessments.push({ user_id: guestId, id: 10 });

  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${guest.access_token}` },
    body: JSON.stringify({ email: 'Person@example.com', password: 'long-enough-password', display_name: 'Person' }),
  });
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(result.user.id, guestId);
  assert.equal(result.user.email, 'person@example.com');
  assert.equal(result.user.is_guest, false);
  assert.equal(assessments[0].user_id, guestId);
  assert.ok(result.access_token);
});

test('login and profile endpoints require and enforce registered authentication', async () => {
  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'PERSON@example.com', password: 'long-enough-password' }),
  });
  const login = await loginResponse.json();
  assert.equal(loginResponse.status, 200);

  const denied = await fetch(`${baseUrl}/api/profile`);
  assert.equal(denied.status, 401);

  const profileResponse = await fetch(`${baseUrl}/api/profile`, {
    headers: { authorization: `Bearer ${login.access_token}` },
  });
  assert.equal(profileResponse.status, 200);

  const updateResponse = await fetch(`${baseUrl}/api/profile`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${login.access_token}` },
    body: JSON.stringify({ country: 'China', preferred_language: 'zh-CN', age_group: '25_34', interests: ['research', 'design'], career_goals: 'Lead a product team.' }),
  });
  const updated = await updateResponse.json();
  assert.equal(updateResponse.status, 200);
  assert.equal(updated.profile.country, 'China');
  assert.equal(updated.profile.preferred_language, 'zh-CN');
  assert.deepEqual(updated.profile.interests, ['research', 'design']);

  const wrongPassword = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'person@example.com', password: 'incorrect-password' }),
  });
  assert.equal(wrongPassword.status, 401);
});

test('registered users can transfer completed guest assessments', async () => {
  const accountResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'second@example.com', password: 'another-long-password' }),
  });
  const account = await accountResponse.json();
  const guestResponse = await fetch(`${baseUrl}/api/auth/guest`, { method: 'POST' });
  const guest = await guestResponse.json();
  assessments.push({ user_id: guest.user.id, id: 20 });

  const response = await fetch(`${baseUrl}/api/auth/transfer`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${account.access_token}` },
    body: JSON.stringify({ guest_access_token: guest.access_token }),
  });
  const result = await response.json();

  assert.equal(response.status, 200);
  assert.equal(result.transferred_assessments, 1);
  assert.equal(assessments.at(-1).user_id, account.user.id);
});

test('registration cannot claim a passwordless legacy email row without mailbox verification', async () => {
  const legacy = { id: nextUserId++, email: 'legacy@example.com', display_name: 'Legacy', is_guest: true };
  users.push(legacy);
  assessments.push({ user_id: legacy.id, id: 30 });

  const response = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'LEGACY@example.com', password: 'legacy-long-password' }),
  });
  const result = await response.json();

  assert.equal(response.status, 409);
  assert.equal(result.access_token, undefined);
  assert.equal(legacy.is_guest, true);
  assert.equal(assessments.at(-1).user_id, legacy.id);
});
