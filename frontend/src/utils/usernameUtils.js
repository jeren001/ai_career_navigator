// ==========================================
// PROJECT: AI CAREER
// FILE: usernameUtils.js
// PURPOSE: Reusable username utilities
// ==========================================


// ==========================================
// 01. USERNAME VALIDATION
// ==========================================

export function validateUsername(username) {

  return /^[a-z0-9_.]{3,20}$/.test(username)

}


// ==========================================
// 02. USERNAME NORMALIZATION
// ==========================================

export function normalizeUsername(username) {

  return username.toLowerCase()

}


// ==========================================
// 03. AUTOMATIC USERNAME GENERATOR
// ==========================================

export function generateUsername(fullName) {

  // Normalize name and remove accents
  const cleanName = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()

  // Separate name into individual words
  const nameParts = cleanName
    .split(/\s+/)
    .filter(Boolean)

  // Check if a valid name exists
  if (nameParts.length === 0) {
    return ''
  }

  // Get first and last name
  const firstName = nameParts[0]
  const lastName = nameParts[nameParts.length - 1]

  // Generate username
  const username =
    nameParts.length > 1
      ? `${firstName}.${lastName}`
      : firstName

  return username.slice(0, 20)

}


// ==========================================
// 04. SMART USERNAME SUGGESTIONS
// ==========================================

export function generateUsernameSuggestions(
  fullName,
  currentUsername = ''
) {

  // Generate base username
  const base = generateUsername(fullName)

  if (!base) {
    return []
  }

  // Separate username components
  const [firstName, lastName = ''] = base.split('.')

  // Generate alternative usernames
  const suggestions = [
    ...(lastName ? [
      `${firstName}_${lastName}`,
      `${firstName}${lastName}`,
      `${firstName.charAt(0)}.${lastName}`
    ] : []),

    `${base.slice(0, 18)}24`,
    `${base.slice(0, 17)}108`,
    `${base.slice(0, 17)}365`
  ]

  // Remove duplicates and invalid usernames
  return [...new Set(suggestions)]
    .filter((suggestion) =>
      suggestion !== currentUsername.toLowerCase() &&
      validateUsername(suggestion)
    )
    .slice(0, 5)

}