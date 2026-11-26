import assert from 'node:assert/strict';
import { test } from 'node:test';
import bank from '../database/interview-questions.json' with { type: 'json' };
import { INTERVIEW_DIFFICULTIES, interviewRounds } from '../src/services/interview-bank.js';

test('interview bank supports every field and difficulty in both languages', () => {
  assert.equal(new Set(bank.questions.map(({ id }) => id)).size, 150);
  for (const career_field of bank.careerFields) {
    for (const difficulty of INTERVIEW_DIFFICULTIES) {
      const profession = { slug: 'no-specific-questions', career_field };
      const english = interviewRounds(profession, difficulty, 'en');
      const chinese = interviewRounds(profession, difficulty, 'zh-CN');
      assert.equal(english.length, 3);
      assert.deepEqual(english.map(({ question }) => question.id), chinese.map(({ question }) => question.id));
      for (const round of chinese) {
        assert.equal(round.question.relevance, 'career_field');
        assert.match(round.question.text, /\p{Script=Han}/u);
        assert.equal(round.follow_ups.length, 2);
        assert.equal(round.rubric.reduce((total, item) => total + item.max_points, 0), 4);
      }
    }
  }
  const [first] = interviewRounds({ slug: 'backend-engineer', career_field: 'Technology & AI' }, 'beginner', 'en');
  assert.equal(first.question.id, 'iq-ta-review-feedback');
  assert.equal(first.question.relevance, 'profession');
});
