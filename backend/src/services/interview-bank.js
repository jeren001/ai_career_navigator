import bank from '../../database/interview-questions.json' with { type: 'json' };

export const INTERVIEW_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

export function interviewRounds(profession, difficulty, language) {
  return bank.questions
    .filter((item) => item.careerField === profession.career_field && item.difficulty === difficulty)
    .sort((a, b) => Number(b.professionSlugs.includes(profession.slug)) - Number(a.professionSlugs.includes(profession.slug)))
    .slice(0, 3)
    .map((item) => ({
      question: {
        id: item.id, type: item.type, text: item.question[language], source: 'bank',
        relevance: item.professionSlugs.includes(profession.slug) ? 'profession' : 'career_field',
      },
      follow_ups: item.followUps.map((text) => text[language]),
      rubric: item.rubric.criteria.map(({ id, maxPoints, fullCreditWhen }) =>
        ({ id, max_points: maxPoints, full_credit_when: fullCreditWhen[language] })),
    }));
}

export function interviewGuidance(language) {
  return {
    examples: bank.practiceGuidance.examples[language],
    interpretation: bank.rubricPolicy.interpretation[language],
  };
}

export function interviewScale(language) {
  return bank.rubricPolicy.scale.map(({ points, meaning }) => ({ points, meaning: meaning[language] }));
}
