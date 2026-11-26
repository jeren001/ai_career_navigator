import assert from 'node:assert/strict'
import test from 'node:test'
import { ApiError, createApiClient } from '../src/lib/api.js'
import { careerText, searchCareers } from '../src/lib/careers.js'
import { readSessionToken, storeSessionToken } from '../src/lib/storage.js'
import { apiErrorText } from '../src/lib/locale.js'
import { profileFromAccount, profilePatch } from '../src/lib/profile.js'

test('client sends JSON and bearer credentials only when requested', async () => {
  const request = createApiClient({
    baseUrl: 'https://example.com/backend/',
    fetchImpl: async (url, options) => {
      assert.equal(url, 'https://example.com/backend/api/auth/register')
      assert.equal(options.method, 'POST')
      assert.deepEqual(options.headers, {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: 'Bearer guest-token'
      })
      assert.deepEqual(JSON.parse(options.body), {
        display_name: 'Candidate', email: 'candidate@example.com', password: 'long password'
      })
      return Response.json({ access_token: 'account-token' }, { status: 201 })
    }
  })
  const result = await request('/api/auth/register', {
    method: 'POST', token: 'guest-token',
    body: { display_name: 'Candidate', email: 'candidate@example.com', password: 'long password' }
  })
  assert.equal(result.access_token, 'account-token')
})

test('public requests omit credentials and support empty responses', async () => {
  const request = createApiClient({
    fetchImpl: async (_, { method, headers, body }) => {
      assert.equal(method, 'GET')
      assert.deepEqual(headers, { Accept: 'application/json' })
      assert.equal(body, undefined)
      return new Response(null, { status: 204 })
    }
  })
  assert.equal(await request('/api/careers'), null)
})

test('client keeps HTTP status on JSON and non-JSON errors', async () => {
  const denied = createApiClient({ fetchImpl: async () => Response.json({ error: 'Denied' }, { status: 401 }) })
  await assert.rejects(denied('/api/auth/me'), { name: 'ApiError', status: 401, message: 'Denied' })
  const unreachable = createApiClient({ fetchImpl: async () => new Response('<html/>', { status: 503 }) })
  await assert.rejects(unreachable('/api/auth/me'), { name: 'ApiError', status: 503 })
  const malformed = createApiClient({ fetchImpl: async () => new Response('<html/>') })
  await assert.rejects(malformed('/api/auth/me'), { name: 'ApiError', status: 502 })
})

test('client distinguishes network failure from cancellation', async () => {
  const offline = createApiClient({ fetchImpl: async () => { throw new TypeError('Failed to fetch') } })
  await assert.rejects(offline('/api/careers'), { name: 'ApiError', status: 0 })
  const controller = new AbortController()
  controller.abort()
  const canceled = createApiClient({ fetchImpl: async (_, { signal }) => { signal.throwIfAborted() } })
  await assert.rejects(canceled('/api/careers', { signal: controller.signal }), { name: 'AbortError' })
})

test('remember me uses opt-in persistence and logout clears both stores', () => {
  const storage = () => {
    const data = new Map()
    return {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
      removeItem: (key) => data.delete(key)
    }
  }
  globalThis.window = { localStorage: storage(), sessionStorage: storage() }
  try {
    storeSessionToken('persistent', true)
    assert.equal(readSessionToken(), 'persistent')
    globalThis.window.sessionStorage = storage()
    assert.equal(readSessionToken(), 'persistent')
    storeSessionToken('tab-only')
    assert.equal(readSessionToken(), 'tab-only')
    assert.equal(window.localStorage.getItem('career-navigator-token'), null)
    storeSessionToken(null)
    assert.equal(readSessionToken(), null)
  } finally {
    delete globalThis.window
  }
})

test('public career search loads localized content and retains English fallbacks', () => {
  const careers = [
    { id: 1, slug: 'data-analyst', title: 'Data Analyst', summary: 'Study data.',
      market_pulse: { career_field: 'Technology & AI', translations: { 'zh-CN': { title: '数据分析师' } } } },
    { id: 2, slug: 'illustrator', title: 'Illustrator', summary: 'Draw images.', cluster: 'Design' }
  ]
  assert.deepEqual(careerText(careers[0], 'zh-CN'), {
    title: '数据分析师', summary: 'Study data.', field: 'Technology & AI'
  })
  assert.deepEqual(searchCareers(careers, '数据', 'zh-CN').map(({ id }) => id), [1])
  assert.deepEqual(searchCareers(careers, 'DRAW', 'en').map(({ id }) => id), [2])
  assert.deepEqual(searchCareers(careers, '   ', 'en'), [])
})

test('problem messages distinguish invalid credentials from session expiry', () => {
  const chinese = (_, zh) => zh
  assert.equal(apiErrorText(new ApiError(401, 'Unauthorized'), chinese, 'login'), '邮箱或密码不正确。')
  assert.equal(apiErrorText(new ApiError(401, 'Unauthorized'), chinese), '会话已过期，请重新登录。')
})

test('all editable profile fields use the API names and reload from the account response', () => {
  const edits = {
    firstName: 'Ada', lastName: 'Cheng', username: 'ada.cheng', dateOfBirth: '1999-05-02',
    country: 'CN', city: '北京', currentStatus: 'University Student',
    careerGoal: '学习产品设计', aboutMe: '喜欢无障碍设计。'
  }
  const wire = {
    first_name: 'Ada', last_name: 'Cheng', username: 'ada.cheng', date_of_birth: '1999-05-02',
    country: 'CN', city: '北京', current_status: 'University Student',
    career_goals: '学习产品设计', about_me: '喜欢无障碍设计。'
  }
  assert.deepEqual(profilePatch(edits, {}), wire)
  assert.deepEqual(profileFromAccount({ ...wire, email: 'user@example.test', email_verified_at: '2026-11-25' }), {
    ...edits, email: 'user@example.test', emailVerified: true
  })
  assert.deepEqual(profilePatch({ city: '', aboutMe: ' ' }, edits), { city: null, about_me: null })
})

test('structured names retain the other name when upgrading a legacy display name', () => {
  const legacy = profileFromAccount({ display_name: 'Ada Cheng Wu' })
  assert.deepEqual(profilePatch({ firstName: 'June' }, legacy), { first_name: 'June', last_name: 'Cheng Wu' })
  const mononym = profileFromAccount({ display_name: 'Old Name', first_name: 'Ari', last_name: null })
  assert.equal(mononym.lastName, '')
})

test('private profile photos send raw bytes and decode authenticated binary responses', async () => {
  const photo = new Blob(['test bytes'], { type: 'image/png' })
  const request = createApiClient({
    fetchImpl: async (url, options) => {
      assert.match(url, /\/api\/profile\/photo$/)
      assert.equal(options.headers.Authorization, 'Bearer photo-user')
      if (options.method === 'PUT') {
        assert.equal(options.headers['Content-Type'], 'image/png')
        assert.equal(options.body, photo)
        return Response.json({ profile_photo_url: '/api/profile/photo' })
      }
      assert.equal(options.headers.Accept, 'image/jpeg')
      return new Response(new Blob(['encoded'], { type: 'image/jpeg' }))
    }
  })
  await request('/api/profile/photo', { method: 'PUT', rawBody: photo, token: 'photo-user' })
  const restored = await request('/api/profile/photo', { responseType: 'blob', token: 'photo-user' })
  assert.equal(await restored.text(), 'encoded')
})
