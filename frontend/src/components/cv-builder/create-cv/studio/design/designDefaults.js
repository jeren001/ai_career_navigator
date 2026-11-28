export const pageDimensions = {
  A4: [210, 297],
  A3: [297, 420],
  'US Letter': [215.9, 279.4]
}

export const fontFamilies = {
  'sans-serif': 'Arial, "Noto Sans", system-ui, sans-serif',
  serif: 'Georgia, "Noto Serif", "Times New Roman", serif',
  Arial: 'Arial, "Noto Sans", system-ui, sans-serif',
  Georgia: 'Georgia, "Noto Serif", "Times New Roman", serif',
  Verdana: 'Verdana, "Noto Sans", system-ui, sans-serif',
  monospace: '"Courier New", "Noto Sans Mono", monospace'
}

export const accentColors = ['#071B60', '#2987F5', '#222222', '#145C58', '#67418B', '#9C342E', '#FFD12E']
export const isHexColor = value => /^#[0-9a-f]{6}$/i.test(value)

export function twoColumnRestriction(template) {
  if (template.id === 'ats-friendly') return 'ATS-Friendly uses a single reading column.'
  if (template.layout.entryStyle === 'grid') return 'This template uses full-width tabular entries.'
  return ''
}

export function resolveDesign(template, overrides = {}) {
  const defaults = template.layout
  const templateColumns = defaults.sidebarPosition ? 'two' : 'one'
  const columns = overrides.columns === 'two' && twoColumnRestriction(template)
    ? templateColumns
    : overrides.columns ?? templateColumns

  return {
    accent: isHexColor(overrides.accent) ? overrides.accent : defaults.accent,
    fontFamily: overrides.fontFamily ?? defaults.fontFamily,
    fontSize: overrides.fontSize ?? 10,
    lineSpacing: overrides.lineSpacing ?? 1.5,
    pageSize: overrides.pageSize ?? 'A4',
    margins: overrides.margins ?? 12,
    columns,
    photo: overrides.showPhoto ? overrides.photo : undefined
  }
}
