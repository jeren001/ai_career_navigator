export const numberText = value => new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)
export const scoreText = value => value === null ? 'Unavailable' : `${numberText(value)}%`
export const deltaText = value => value === null ? 'Unavailable'
  : Math.abs(value) < .05 ? 'Unchanged' : `${value > 0 ? '+' : '−'}${numberText(Math.abs(value))} pp`
export const dateText = value => new Date(value).toLocaleDateString()
