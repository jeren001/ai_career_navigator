export const defaultInterviewWorkspace = 'local-browser'
export const legacySessionKey = 'interview-simulator:sessions:v1'
export const legacyWorkspaceKey = 'interview-simulator:legacy-workspace:v1'
export const interviewWorkspaceKey = 'interview-simulator:workspace:v1'

export function resetInterviewWorkspace() {
  try {
    if (sessionStorage.getItem(legacySessionKey) && !sessionStorage.getItem(legacyWorkspaceKey)) {
      sessionStorage.setItem(legacyWorkspaceKey, getInterviewWorkspace())
    }
  } catch {
    // Keep any unmigrated legacy data in the tab.
  }
  try {
    localStorage.setItem(interviewWorkspaceKey, crypto.randomUUID())
  } catch {
    // The browser can restrict storage access.
  }
}

export function getInterviewWorkspace() {
  return localStorage.getItem(interviewWorkspaceKey) ?? defaultInterviewWorkspace
}

export function openInterviewDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('ai-career-interviews', 1)
    let blocked = false
    request.onupgradeneeded = () => {
      const store = request.result.createObjectStore('sessions', { keyPath: ['workspace', 'id'] })
      store.createIndex('byWorkspace', 'workspace')
    }
    request.onsuccess = () => {
      if (blocked) request.result.close()
      else resolve(request.result)
    }
    request.onerror = () => reject(request.error)
    request.onblocked = () => {
      blocked = true
      reject(new Error('Close older interview tabs and try again.'))
    }
  })
}

export function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function withSessionStore(database, action) {
  const tx = database.transaction('sessions', 'readwrite')
  const done = new Promise((resolve, reject) => {
    tx.oncomplete = resolve
    tx.onabort = () => reject(tx.error ?? new Error('Interview storage transaction aborted.'))
  })
  try {
    const result = await action(tx.objectStore('sessions'))
    await done
    return result
  } catch (error) {
    try { tx.abort() } catch { /* The transaction has already settled. */ }
    await done.catch(() => {})
    throw error
  }
}
