import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import pool from '../src/db/pool.js';
import { resetGeminiStateForTests, setAiProvidersForTests } from '../src/services/assessment-ai.js';
import { createAccessToken } from '../src/services/auth.js';

const pdfType = 'application/pdf';
const docxType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function pdfFixture() {
  const content = 'BT /F1 12 Tf 72 740 Td (Built a transit dashboard.) Tj ET\n';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Count 1 /Kids [3 0 R] >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    '<< /Length ' + content.length + ' >>\nstream\n' + content + 'endstream',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let result = '%PDF-1.4\n';
  const offsets = objects.map((object, index) => {
    const offset = result.length;
    result += (index + 1) + ' 0 obj\n' + object + '\nendobj\n';
    return String(offset).padStart(10, '0') + ' 00000 n \n';
  });
  const xref = result.length;
  return Buffer.from(result + 'xref\n0 6\n0000000000 65535 f \n' + offsets.join('') +
    'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
}

function docxFixture(mode) {
  return execFileSync('python3', ['-I', '-c', [
    'from zipfile import ZipFile, ZIP_DEFLATED',
    'from io import BytesIO',
    'import sys',
    'buffer = BytesIO()',
    'with ZipFile(buffer, "w", ZIP_DEFLATED) as archive:',
    '    archive.writestr("[Content_Types].xml", \'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>\')',
    '    dtd = "<!DOCTYPE test>" if sys.argv[1] == "dtd" else ""',
    '    lines = ["姓名：测试用户", "项目经历", "公交数据项目", "技能：SQL、数据分析"]',
    '    body = "".join("<w:p><w:r><w:t>" + line + "</w:t></w:r></w:p>" for line in lines)',
    '    archive.writestr("word/document.xml", dtd + \'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>\' + body + \'</w:body></w:document>\')',
    '    if sys.argv[1] == "macro":',
    '        archive.writestr("word/vbaProject.bin", b"test")',
    'sys.stdout.buffer.write(buffer.getvalue())',
  ].join('\n'), mode]);
}

test('My Resume handles private documents, verified ownership, consent, AI fallback, and deletion',
  { skip: process.env.RUN_SKILLS_POSTGRES_TEST !== '1', timeout: 25_000 }, async () => {
    const database = await pool.connect();
    let server;
    try {
      await database.query('BEGIN');
      const { rows: [owner, other, guest] } = await database.query(
        'INSERT INTO users (is_guest) VALUES (false), (false), (true) RETURNING id, is_guest',
      );
      const tokens = new Map([owner, other, guest].map((user) => [user, createAccessToken(user)]));
      server = createApp(database).listen(0, '127.0.0.1');
      await once(server, 'listening');
      const origin = 'http://127.0.0.1:' + server.address().port;
      const base = '/api/resumes';
      async function request(path, method = 'GET', body, identity = owner, mediaType) {
        const token = tokens.get(identity);
        const response = await fetch(origin + path, {
          method,
          headers: {
            ...(token && { authorization: 'Bearer ' + token }),
            ...(body !== undefined && { 'content-type': mediaType ?? 'application/json' }),
          },
          body: body === undefined || mediaType ? body : JSON.stringify(body),
        });
        const contentType = response.headers.get('content-type') ?? '';
        return {
          status: response.status,
          headers: response.headers,
          data: contentType.includes('application/json') ? await response.json() : Buffer.from(await response.arrayBuffer()),
        };
      }

      const spec = (await request('/api-docs/openapi.json')).data;
      assert.deepEqual(spec.paths[base + '/upload'].post.security, [{ bearerAuth: [] }]);
      assert.equal(spec.paths[base + '/upload'].post.requestBody.content[docxType].schema.format, 'binary');
      const pdf = pdfFixture();
      assert.equal((await request(base + '/upload', 'POST', pdf, null, pdfType)).status, 401);
      assert.equal((await request(base, 'POST', { title: 'Guest' }, guest)).status, 401);
      assert.equal((await request(base + '/upload', 'POST', pdf, owner, 'text/plain')).status, 415);
      assert.equal((await request(base + '/upload', 'POST', pdf, owner, docxType)).status, 422);
      assert.equal((await request(base + '/upload', 'POST', Buffer.from('%PDF-bad'), owner, pdfType)).status, 422);
      assert.equal((await request(base + '/upload', 'POST', Buffer.alloc(5 * 1024 * 1024 + 1), owner, pdfType)).status, 413);
      assert.equal((await request(base + '/upload', 'POST', docxFixture('macro'), owner, docxType)).status, 422);
      assert.equal((await request(base + '/upload', 'POST', docxFixture('dtd'), owner, docxType)).status, 422);

      const docx = docxFixture('normal');
      const uploadedDocx = await request(base + '/upload?language=zh-CN', 'POST', docx, owner, docxType);
      assert.equal(uploadedDocx.status, 201);
      assert.match(uploadedDocx.data.resume.extracted_text, /公交数据项目/u);
      assert.equal(uploadedDocx.data.resume.title, '简历');
      assert.deepEqual(uploadedDocx.data.extraction.contact, { full_name: '测试用户' });
      assert.deepEqual(uploadedDocx.data.extraction.sections.projects, [{ name: '公交数据项目' }]);
      assert.deepEqual(uploadedDocx.data.resume.sections.projects, []);
      const extractionPath = base + '/' + uploadedDocx.data.resume.id + '/extraction';
      assert.deepEqual((await request(extractionPath)).data.extraction, uploadedDocx.data.extraction);
      assert.equal((await request(extractionPath, 'GET', undefined, other)).status, 404);
      const uploadedPdf = await request(base + '/upload?title=Transit', 'POST', pdf, owner, pdfType);
      assert.equal(uploadedPdf.status, 201);
      assert.match(uploadedPdf.data.resume.extracted_text, /Built a transit dashboard/u);
      const document = base + '/' + uploadedPdf.data.resume.id;
      const file = await request(document + '/file');
      assert.equal(file.status, 200);
      assert.equal(file.headers.get('cache-control'), 'private, no-store');
      assert.equal(file.headers.get('x-content-type-options'), 'nosniff');
      assert.match(file.headers.get('content-disposition'), /^attachment/u);
      assert.deepEqual(file.data, pdf);
      assert.equal((await request(document, 'GET', undefined, other)).status, 404);
      assert.equal((await request(document + '/file', 'GET', undefined, other)).status, 404);
      assert.equal((await request(document, 'PATCH', { title: 'Unavailable' }, other)).status, 404);
      assert.equal((await request(document, 'DELETE', undefined, other)).status, 404);

      const created = await request(base, 'POST', { title: '分析简历', language: 'zh-CN', sections: {
        skills: [{ name: 'SQL' }],
        education: [{ name: 'Statistics' }],
        work_experience: [{ name: 'Analyst', organization: 'Transit Lab' }],
        projects: [{ name: 'Transit dashboard', details: 'Send test@example.test this update.' }],
        certifications: [{ name: 'Database course' }],
      } });
      assert.equal(created.status, 201);
      const uri = base + '/' + created.data.resume.id;
      assert.equal((await request(uri + '/file')).status, 404);
      assert.equal((await request(uri, 'PATCH', { sections: { skills: [{ name: 'SQL', level: 5 }] } })).status, 400);
      const updated = await request(uri, 'PATCH', { sections: { certifications: [] } });
      assert.equal(updated.status, 200);
      assert.deepEqual(updated.data.resume.sections.certifications, []);
      assert.deepEqual(updated.data.resume.sections.skills, [{ name: 'SQL' }]);
      const editor = await request(uri, 'PATCH', {
        contact: { full_name: '测试用户', email: 'editor@example.test' },
        styling: { font_family: 'Inter', accent_color: '#123456', font_size: 12 },
        custom_sections: [{ title: '志愿服务', content: '测试用户参与社区公益活动。' }],
        draft_progress: { current_step: 'style', completed_steps: ['contact', 'sections'] },
      });
      assert.equal(editor.status, 200);
      const draft = await request(uri, 'PATCH', { contact: { email: null }, draft_progress: { current_step: 'review' } });
      assert.deepEqual(draft.data.resume.contact, { full_name: '测试用户' });
      assert.deepEqual(draft.data.resume.styling, editor.data.resume.styling);
      assert.equal(draft.data.resume.custom_sections[0].title, '志愿服务');
      assert.deepEqual(draft.data.resume.draft_progress, { current_step: 'review', completed_steps: ['contact', 'sections'] });
      const list = (await request(base)).data.resumes;
      assert.equal(list.length, 3);
      assert.equal(list[0].extracted_text, undefined);
      assert.deepEqual((await request(base, 'GET', undefined, other)).data.resumes, []);
      assert.equal((await request(uri + '/analyze', 'POST', {})).status, 400);
      assert.equal((await request(uri + '/analyze', 'POST', { consent: true }, other)).status, 404);

      let providerCalls = 0;
      setAiProvidersForTests([{
        id: 'gemini', model: 'resume-fixture',
        async generate({ contents }) {
          providerCalls += 1;
          assert.match(contents, /Simplified Chinese/u);
          assert.match(contents, /Transit dashboard/u);
          assert.doesNotMatch(contents, /test@example.test/u);
          assert.doesNotMatch(contents, /测试用户|editor@example.test/u);
          const input = JSON.parse(contents.split('\n').at(-1));
          assert.equal(input.context.target_role, 'Analyst');
          const project = input.evidence.find(({ section }) => section === 'projects');
          assert.ok(input.evidence.some(({ section, text }) => section === 'custom' && text.includes('志愿服务')));
          return JSON.stringify({ suggestions: [{ evidence_id: project.id, action_id: 'clarify_result', degree: 'Invented' }] });
        },
      }]);
      const analyzed = await request(uri + '/analyze', 'POST', { consent: true, target_role: 'Analyst' });
      assert.equal(analyzed.status, 200);
      assert.equal(analyzed.headers.get('cache-control'), 'private, no-store');
      assert.equal(analyzed.data.guidance.status, 'ai');
      assert.match(analyzed.data.guidance.suggestions[0].action, /\p{Script=Han}/u);
      assert.equal(analyzed.data.guidance.suggestions[0].evidence.source, 'resume_claim');
      assert.doesNotMatch(JSON.stringify(analyzed.data), /Invented/u);
      assert.equal(providerCalls, 1);
      setAiProvidersForTests([]);
      const fallback = await request(uri + '/analyze', 'POST', { consent: true });
      assert.equal(fallback.data.guidance.status, 'fallback');
      assert.equal(fallback.data.guidance.reason, 'not_configured');

      const { rows: [role] } = await database.query(
        "SELECT id, slug, title, market_pulse FROM career_roles WHERE slug = 'data-analyst' AND is_active",
      );
      await database.query(
        "INSERT INTO quiz_sessions (user_id, answers, trait_scores, recommended_roles) VALUES ($1, '[]', '{}', $2::jsonb)",
        [owner.id, JSON.stringify([{ ...role, reason: 'Interest in analytics.' }])],
      );
      const resume_context = { resume_id: created.data.resume.id, consent: true };
      const compareBody = { career_ids: [role.id] };
      assert.equal((await request('/api/skills/compare', 'POST', { ...compareBody, resume_context: { ...resume_context, consent: false } })).status, 400);
      assert.equal((await request('/api/skills/compare', 'POST', { ...compareBody, resume_context, include_ai: false })).status, 400);
      const ordinary = await request('/api/skills/compare', 'POST', compareBody);
      assert.equal(ordinary.status, 200);
      assert.equal(ordinary.data.resume_guidance, undefined);
      const compared = await request('/api/skills/compare', 'POST', { ...compareBody, resume_context });
      assert.equal(compared.status, 200);
      assert.equal(compared.headers.get('cache-control'), 'private, no-store');
      assert.equal(compared.data.resume_guidance.status, 'fallback');
      assert.deepEqual(compared.data.prioritized_gaps, ordinary.data.prioritized_gaps);
      const match = await request('/api/career-match/refresh', 'POST', { resume_context });
      assert.equal(match.status, 200);
      assert.equal(match.headers.get('cache-control'), 'private, no-store');
      assert.ok(match.data.resume_guidance);
      assert.equal((await request('/api/career-match')).data.resume_guidance, undefined);

      const planned = await request('/api/roadmaps', 'POST', { resume_context });
      assert.equal(planned.status, 201);
      assert.equal(planned.headers.get('cache-control'), 'private, no-store');
      assert.ok(planned.data.roadmap.resume_guidance);
      assert.equal((await request('/api/roadmaps/' + planned.data.roadmap.id)).data.roadmap.resume_guidance, undefined);

      const interview = await request('/api/interviews', 'POST', { profession_slug: role.slug, difficulty: 'beginner' });
      assert.equal(interview.status, 201);
      const interviewUri = '/api/interviews/' + interview.data.session.id;
      let session = interview.data.session;
      for (let i = 0; i < 6; i += 1) {
        const answer = await request(interviewUri + '/answers', 'POST', { question_id: session.current_question.id, answer: 'I used synthetic transit data.' });
        assert.equal(answer.status, 200);
        session = answer.data.session;
      }
      const evaluation = await request(interviewUri + '/evaluate', 'POST', { resume_context });
      assert.equal(evaluation.status, 200);
      assert.equal(evaluation.headers.get('cache-control'), 'private, no-store');
      assert.ok(evaluation.data.session.resume_guidance);
      assert.equal((await request(interviewUri)).data.session.resume_guidance, undefined);

      assert.equal((await request(document, 'DELETE')).status, 204);
      assert.equal((await request(document + '/file')).status, 404);
      assert.equal((await request(document)).status, 404);
      assert.equal((await request(uri, 'DELETE')).status, 204);
      assert.equal((await request(uri + '/analyze', 'POST', { consent: true })).status, 404);
      assert.equal((await request('/api/roadmaps', 'POST', { resume_context })).status, 404);
      const removed = await database.query('SELECT id FROM resumes WHERE id IN ($1, $2)', [uploadedPdf.data.resume.id, created.data.resume.id]);
      assert.equal(removed.rowCount, 0);
    } finally {
      resetGeminiStateForTests();
      if (server) await new Promise((resolve) => server.close(resolve));
      await database.query('ROLLBACK');
      database.release();
      await pool.end();
    }
  });
