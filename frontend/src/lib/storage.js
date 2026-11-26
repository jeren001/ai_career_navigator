const TOKEN_KEY = 'career-navigator-token'

export function readStorage(key, persistent) {
  try {
    return (persistent ? window.localStorage : window.sessionStorage).getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key, value, persistent) {
  try {
    const storage = persistent ? window.localStorage : window.sessionStorage
    if (value === null) storage.removeItem(key)
    else storage.setItem(key, value)
  } catch {
    // The active session can still work in memory when browser storage is blocked.
  }
}

export function readSessionToken() {
  return readStorage(TOKEN_KEY, false) || readStorage(TOKEN_KEY, true)
}

export function storeSessionToken(token, remember = false) {
  writeStorage(TOKEN_KEY, remember ? null : token, false)
  writeStorage(TOKEN_KEY, remember ? token : null, true)
}

export function readProfileUsername(userId) {
  return readStorage(`career-navigator-username-${userId}`, true) || ''
}

export function storeProfileUsername(userId, username) {
  writeStorage(`career-navigator-username-${userId}`, username || null, true)
}
