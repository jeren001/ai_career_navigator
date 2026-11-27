const workspaceKey = 'ai-career.cv-workspace'
export const workspaceRevocationPrefix = 'ai-career.cv-workspace-ended.'

export function isCVWorkspaceActive(id) {
  try {
    return Boolean(id && window.sessionStorage.getItem(workspaceKey) === id &&
      !window.localStorage.getItem(workspaceRevocationPrefix + id))
  } catch {
    return false
  }
}

export function getCVWorkspace() {
  try {
    const existing = window.sessionStorage.getItem(workspaceKey)
    if (isCVWorkspaceActive(existing)) return existing

    const id = crypto.randomUUID()
    window.sessionStorage.setItem(workspaceKey, id)
    // Access also requires the origin storage used to revoke sessions on sign-out.
    return isCVWorkspaceActive(id) ? id : null
  } catch {
    return null
  }
}

export function clearCVWorkspace() {
  try {
    const id = window.sessionStorage.getItem(workspaceKey)
    window.sessionStorage.removeItem(workspaceKey)
    if (id) window.localStorage.setItem(workspaceRevocationPrefix + id, '1')
  } catch {
    // Browsers with blocked storage fail closed when opening a workspace.
  }
}
