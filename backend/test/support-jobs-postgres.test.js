import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import pool from '../src/db/pool.js';
import { createAccessToken } from '../src/services/auth.js';
import { searchVacancies } from '../src/services/job-search.js';
import { extractResumeFields } from '../src/services/resume-editor.js';

test('English and Simplified Chinese extraction and provider normalization use explicit source fields', async () => {
  assert.deepEqual(extractResumeFields('Name: Alex\nSkills: SQL, Python\nWork Experience\nAnalyst').sections, {
    skills: [{ name: 'SQL' }, { name: 'Python' }], work_experience: [{ name: 'Analyst' }],
  });
  assert.deepEqual(extractResumeFields('姓名：张三\n项目经历：数据分析\n专业技能\n统计、SQL').sections, {
    projects: [{ name: '数据分析' }], skills: [{ name: '统计' }, { name: 'SQL' }],
  });
  const provider = {
    id: 'fixture',
    search({ language, keyword, cursor, signal }) {
      assert.equal(language, 'zh-CN');
      assert.equal(keyword, '分析');
      assert.equal(cursor, 'page-1');
      assert.equal(signal.aborted, false);
      return { items: [{ external_id: '123', url: 'https://example.test/jobs/123', title: '实习生', kind: 'internship' }] };
    },
  };
  const result = await searchVacancies({ language: 'zh-CN', q: '分析', cursor: 'page-1' }, provider);
  assert.equal(result.availability, 'available');
  assert.equal(result.vacancies[0].provider, 'fixture');
  await assert.rejects(searchVacancies({}, { id: 'fixture', search: () => ({ items: [{ kind: 'fake' }] }) }), { status: 503 });
});

test('support and application tracking persist with account and staff isolation',
  { skip: process.env.RUN_SKILLS_POSTGRES_TEST !== '1', timeout: 15_000 }, async () => {
    const database = await pool.connect();
    let server;
    try {
      await database.query('BEGIN');
      const { rows: [owner, other, staff, guest] } = await database.query(`
        INSERT INTO users (is_guest, preferred_language)
        VALUES (false, 'zh-CN'), (false, 'en'), (false, 'en'), (true, 'en') RETURNING id, is_guest
      `);
      await database.query('INSERT INTO support_staff (user_id) VALUES ($1)', [staff.id]);
      server = createApp(database).listen(0, '127.0.0.1');
      await once(server, 'listening');
      const origin = `http://127.0.0.1:${server.address().port}/api`;
      async function request(path, method = 'GET', body, account = owner) {
        const response = await fetch(origin + path, {
          method,
          headers: {
            ...(account && { authorization: 'Bearer ' + createAccessToken(account) }),
            ...(body !== undefined && { 'content-type': 'application/json' }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: response.status, data: response.status === 204 ? null : await response.json() };
      }

      const tickets = '/support/tickets';
      assert.equal((await request(tickets, 'GET', undefined, guest)).status, 401);
      assert.equal((await request(tickets, 'POST', { subject: '帮助', message: '需要协助', status: 'closed' })).status, 400);
      const created = await request(tickets, 'POST', { subject: '帮助', message: '需要协助' });
      assert.equal(created.status, 201, JSON.stringify(created.data));
      assert.equal(created.data.ticket.language, 'zh-CN');
      const ticket = tickets + '/' + created.data.ticket.id;
      assert.equal((await request(ticket, 'GET', undefined, other)).status, 404);
      assert.equal((await request(ticket + '/status', 'PATCH', { status: 'resolved' })).status, 403);
      assert.equal((await request('/support/queue', 'GET', undefined, other)).status, 403);
      assert.equal((await request('/support/queue?status=open', 'GET', undefined, staff)).data.tickets.length, 1);
      const resolved = await request(ticket + '/status', 'PATCH', { status: 'resolved', message: '已处理' }, staff);
      assert.equal(resolved.status, 200, JSON.stringify(resolved.data));
      assert.equal((await request(ticket + '/status', 'PATCH', { status: 'resolved' }, staff)).status, 200);
      const detail = await request(ticket);
      assert.deepEqual(detail.data.ticket.history.map(({ actor, status }) => [actor, status]), [['account', 'open'], ['staff', 'resolved']]);
      assert.equal(detail.data.ticket.history[1].message, '已处理');
      assert.equal((await request(tickets, 'POST', { subject: 'Account help', message: 'Please review' }, other)).data.ticket.language, 'en');

      const search = await request('/jobs/search?language=zh-CN', 'GET', undefined, null);
      assert.deepEqual(search.data, { availability: 'not_configured', language: 'zh-CN', vacancies: [], next_cursor: null });
      const saved = '/jobs/saved';
      const link = { url: 'https://example.test/internship', title: '数据实习', employer: '示例单位' };
      assert.equal((await request(saved, 'POST', link, guest)).status, 401);
      assert.equal((await request(saved, 'POST', { ...link, url: 'file:///tmp/job' })).status, 400);
      const savedJob = await request(saved, 'POST', link);
      assert.equal(savedJob.status, 201, JSON.stringify(savedJob.data));
      const job = saved + '/' + savedJob.data.job.id;
      assert.equal((await request(saved, 'POST', link)).status, 409);
      assert.equal((await request(job, 'GET', undefined, other)).status, 404);
      assert.equal((await request(job, 'PATCH', { status: 'applied' }, other)).status, 404);
      assert.equal((await request(job, 'PATCH', { applied_on: '2025-02-29' })).status, 400);
      const applied = await request(job, 'PATCH', { status: 'applied', notes: '已提交简历', applied_on: '2024-02-29' });
      assert.equal(applied.status, 200, JSON.stringify(applied.data));
      assert.equal(applied.data.job.applied_on, '2024-02-29');
      assert.equal((await request(job, 'PATCH', { status: 'applied' })).status, 200);
      assert.deepEqual((await request(job)).data.job.history.map(({ status }) => status), ['saved', 'applied']);
      assert.equal((await request(saved + '?status=applied')).data.jobs.length, 1);
      assert.deepEqual((await request(saved, 'GET', undefined, other)).data.jobs, []);
      assert.equal((await request(job, 'DELETE', undefined, other)).status, 404);
      assert.equal((await request(job, 'DELETE')).status, 204);
      assert.equal((await request(job)).status, 404);
    } finally {
      if (server) await new Promise((resolve) => server.close(resolve));
      await database.query('ROLLBACK');
      database.release();
      await pool.end();
    }
  });
