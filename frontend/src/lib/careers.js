export function careerText(career, locale) {
  const translation = career.market_pulse?.translations?.[locale]
  return {
    title: translation?.title || career.title,
    summary: translation?.summary || career.summary,
    field: translation?.career_field || career.market_pulse?.career_field || career.cluster
  }
}

export function searchCareers(careers, query, locale, limit = 6) {
  const normalize = (value) => value.normalize('NFKC').toLowerCase()
  const needle = normalize(query.trim())
  if (!needle) return []
  return careers
    .filter((career) => [...Object.values(careerText(career, locale)), career.title, career.slug]
      .some((value) => typeof value === 'string' && normalize(value).includes(needle)))
    .slice(0, limit)
}
