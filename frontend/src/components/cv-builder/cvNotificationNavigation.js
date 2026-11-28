export const unavailableCVMessage = 'This CV is no longer available.'

export function getCVNotificationTarget(item) {
  const target = item?.target
  if (item?.type === 'cv.deleted' || target?.kind !== 'cv') return null
  return typeof target.id === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(target.id) ? target : null
}
