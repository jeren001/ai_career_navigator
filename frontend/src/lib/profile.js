const profileFields = {
  firstName: 'first_name', lastName: 'last_name', username: 'username',
  dateOfBirth: 'date_of_birth', country: 'country', city: 'city',
  currentStatus: 'current_status', careerGoal: 'career_goals', aboutMe: 'about_me'
}

export function profileFromAccount(account) {
  const [first = '', ...last] = (account.display_name ?? '').trim().split(/\s+/)
  const profile = Object.fromEntries(Object.entries(profileFields).map(
    ([field, key]) => [field, account[key] ?? '']
  ))
  if (account.first_name == null && account.last_name == null) {
    profile.firstName = first
    profile.lastName = last.join(' ')
  }
  return { ...profile, email: account.email ?? '', emailVerified: Boolean(account.email_verified_at) }
}

export function profilePatch(changes, profile) {
  const body = Object.fromEntries(Object.entries(profileFields).flatMap(([field, key]) =>
    Object.hasOwn(changes, field) ? [[key, changes[field].trim() || null]] : []
  ))
  // Preserve the untouched part of legacy display names when saving structured names.
  if ('first_name' in body || 'last_name' in body) {
    if (!('first_name' in body)) body.first_name = profile.firstName || null
    if (!('last_name' in body)) body.last_name = profile.lastName || null
  }
  return body
}

export const currentStatusOptions = [
  ['High School Student', '高中生'],
  ['University Student', '大学生'],
  ['Recent Graduate', '应届毕业生'],
  ['Employed', '在职'],
  ['Self-employed', '自雇'],
  ['Unemployed', '待业'],
  ['Other', '其他']
]

export function profileStatusLabel(status, t) {
  const label = currentStatusOptions.find(([value]) => value === status)
  return label ? t(...label) : status
}
