import { availableSections, standardSections } from './sectionCatalog'

const labelToId = new Map(
  Object.entries(standardSections).flatMap(([id, section]) =>
    [section.title, ...(section.aliases ?? [])].map(label => [label, id])
  )
)

export function getSectionGroups(cvData, layout, columns) {
  const config = cvData.sections ?? {}
  const unavailable = new Set(availableSections(cvData))
  const main = []
  const sidebar = []
  const isTwoColumn = columns === 'two'
  const placed = new Set(['personal'])

  function add(id, label, group) {
    if (!id || unavailable.has(id) || placed.has(id)) return
    placed.add(id)
    const settings = config.settings?.[id]
    group.push({ id, title: settings?.title ?? label ?? standardSections[id].title, hidden: Boolean(settings?.hidden) })
  }

  const defaultSidebar = new Set(['skills', 'languages'])
  const configuredSidebar = isTwoColumn && layout.sidebarPosition
    ? layout.sidebarSections
    : layout.mainSections.filter(label => defaultSidebar.has(labelToId.get(label)))

  // Template placements take priority. A synthesized sidebar groups skills and languages.
  if (isTwoColumn) configuredSidebar.forEach(label => add(labelToId.get(label), label, sidebar))
  layout.mainSections.forEach(label => add(labelToId.get(label), label, main))
  if (!isTwoColumn) layout.sidebarSections.forEach(label => add(labelToId.get(label), label, main))

  Object.keys(standardSections).forEach(id => add(id, undefined, isTwoColumn && defaultSidebar.has(id) ? sidebar : main))
  for (const custom of config.custom ?? []) {
    main.push({ id: custom.id, title: custom.title, hidden: Boolean(config.settings?.[custom.id]?.hidden), custom: true })
  }

  const ranks = new Map((config.order ?? []).map((id, index) => [id, index]))
  const sort = group => group.sort((a, b) => (ranks.get(a.id) ?? ranks.size) - (ranks.get(b.id) ?? ranks.size))

  return {
    personal: { id: 'personal', title: config.settings?.personal?.title ?? standardSections.personal.title },
    main: sort(main),
    sidebar: sort(sidebar)
  }
}

export function reorderGroup(previous, groups, group, source, destination) {
  const items = groups[group].map(({ id }) => id)
  const from = items.indexOf(source)
  const to = items.indexOf(destination)
  if (from < 0 || to < 0 || from === to) return previous

  const [item] = items.splice(from, 1)
  items.splice(to, 0, item)

  // Keep the other column and currently removed sections in their existing relative order.
  const order = [...new Set([...(previous.order ?? []), ...groups.main.map(({ id }) => id), ...groups.sidebar.map(({ id }) => id)])]
  const included = new Set(items)
  let index = 0
  return { ...previous, order: order.map(id => included.has(id) ? items[index++] : id) }
}
