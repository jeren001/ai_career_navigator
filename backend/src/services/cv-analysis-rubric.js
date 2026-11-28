export const rubricVersion = '1.0.0';

export const rubric = [
  ['ats_compatibility', 25, [
    ['text_extractability', 25], ['section_identification', 20], ['reading_order', 20],
    ['contact_detection', 15], ['graphic_compatibility', 10], ['document_format', 10],
  ]],
  ['content_quality', 20, [
    ['content_clarity', 25], ['professional_relevance', 25], ['description_quality', 20],
    ['information_completeness', 20], ['absence_of_redundancy', 10],
  ]],
  ['structure_formatting', 15, [
    ['section_organization', 25], ['visual_consistency', 20], ['readability', 20],
    ['date_formatting', 15], ['appropriate_length', 10], ['market_conventions', 10],
  ]],
  ['skills_keywords', 15, [
    ['skills_relevance', 30], ['professional_keywords', 25], ['evidence_of_skills', 20],
    ['skills_specificity', 15], ['skills_organization', 10],
  ]],
  ['professional_impact', 15, [
    ['demonstrated_achievements', 30], ['measurable_results', 25], ['action_verbs', 20],
    ['clear_responsibilities', 15], ['professional_development', 10],
  ]],
  ['grammar_language', 10, [
    ['grammar', 30], ['spelling', 25], ['professional_language', 20],
    ['language_consistency', 15], ['sentence_clarity', 10],
  ]],
];

const bands = [
  [90, 'excellent', 'Excellent', '优秀'],
  [80, 'very_good', 'Very Good', '很好'],
  [70, 'good', 'Good', '良好'],
  [50, 'needs_improvement', 'Needs Improvement', '需要改进'],
  [0, 'significant_improvement_needed', 'Significant Improvement Needed', '需要大幅改进'],
];

export function scoreAnalysis(criteria, language) {
  const categories = rubric.map(([id, weight, definitions]) => {
    const items = definitions.map(([key, max_points]) => ({ id: key, max_points, ...criteria[key] }));
    const scored = items.filter(({ status }) => status === 'scored');
    const maximum = scored.reduce((sum, { max_points }) => sum + max_points, 0);
    const applicable = items.filter(({ status }) => status !== 'not_applicable');
    const earned = scored.reduce((sum, { points }) => sum + points, 0);
    return {
      id, weight, score: maximum ? 100 * earned / maximum : null,
      status: !applicable.length ? 'not_applicable' : !maximum ? 'unavailable'
        : applicable.length === scored.length ? 'complete' : 'partial',
      scored_points_available: maximum,
      applicable_points: applicable.reduce((sum, { max_points }) => sum + max_points, 0),
      criteria: items,
    };
  });
  const applicable = categories.filter(({ status }) => status !== 'not_applicable');
  const scoredWeight = applicable.filter(({ score }) => score !== null).reduce((sum, { weight }) => sum + weight, 0);
  const available = applicable.length > 0 && applicable.every(({ score }) => score !== null);
  const weighted = available ? applicable.reduce((sum, { score, weight }) => sum + score * weight, 0) / scoredWeight : null;
  const score = weighted === null ? null : Math.round(weighted);
  const band = score === null ? null : bands.find(([threshold]) => score >= threshold);
  return {
    categories: categories.map((category) => ({
      ...category, score: category.score === null ? null : Number(category.score.toFixed(2)),
    })),
    overall: {
      score, weighted_score: weighted === null ? null : Number(weighted.toFixed(2)),
      status: score === null ? 'unavailable' : applicable.some(({ status }) => status === 'partial') ? 'partial' : 'complete',
      classification: band ? { id: band[1], label: band[language === 'zh-CN' ? 3 : 2] } : null,
      scored_category_weight: scoredWeight,
    },
  };
}
