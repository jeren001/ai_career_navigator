import { isCVWorkspaceActive } from './cvWorkspace'

const databaseName = 'ai-career-cvs'
const storeName = 'cvs'
const ownerIndex = 'byWorkspace'

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2)
    request.onupgradeneeded = () => {
      const db = request.result
      const store = db.objectStoreNames.contains(storeName)
        ? request.transaction.objectStore(storeName)
        : db.createObjectStore(storeName, { keyPath: 'id' })
      // Version-one records remain on disk. They have no trusted workspace owner.
      store.createIndex(ownerIndex, 'workspaceId')
    }
    let blocked = false
    request.onsuccess = () => {
      if (blocked) request.result.close()
      else resolve(request.result)
    }
    request.onerror = () => reject(request.error)
    request.onblocked = () => {
      blocked = true
      reject(new Error('Close older CV Builder tabs and retry.'))
    }
  })
}

async function transaction(mode, action) {
  const db = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode)
      let value
      let failure
      tx.oncomplete = () => resolve(value)
      tx.onabort = () => reject(failure ?? tx.error ?? new Error('CV transaction was aborted.'))
      const complete = result => { value = result }
      const abort = error => {
        failure = error
        tx.abort()
      }

      try {
        action(tx.objectStore(storeName), complete, abort)
      } catch (error) {
        abort(error)
      }
    })
  } finally {
    db.close()
  }
}

function requireWorkspace(workspaceId) {
  if (!isCVWorkspaceActive(workspaceId)) throw new Error('This browser could not open a private local CV workspace.')
}

function change(workspaceId, id, transform) {
  requireWorkspace(workspaceId)
  return transaction('readwrite', (store, complete, abort) => {
    const request = store.get(id)
    request.onsuccess = () => {
      const current = request.result
      if (!current || current.workspaceId !== workspaceId) {
        abort(new Error('This CV is no longer available in this workspace.'))
        return
      }

      try {
        complete(transform(store, current))
      } catch (error) {
        abort(error)
      }
    }
  })
}

// Each write commits atomically. The UI only receives successful changes after commit.
export const cvRepository = {
  list(workspaceId) {
    requireWorkspace(workspaceId)
    return transaction('readonly', (store, complete) => {
      const request = store.index(ownerIndex).getAll(workspaceId)
      request.onsuccess = () => complete(request.result)
    })
  },
  async get(workspaceId, id) {
    requireWorkspace(workspaceId)
    const record = await transaction('readonly', (store, complete) => {
      const request = store.get(id)
      request.onsuccess = () => {
        const saved = request.result
        complete(saved?.workspaceId === workspaceId ? saved : null)
      }
    })
    requireWorkspace(workspaceId)
    return record
  },
  save(workspaceId, record, updating = false) {
    requireWorkspace(workspaceId)
    const saved = { ...record, workspaceId }
    if (updating) {
      return change(workspaceId, record.id, (store, current) => {
        const update = { ...saved, createdAt: current.createdAt ?? saved.createdAt }
        store.put(update)
        return update
      })
    }
    return transaction('readwrite', (store, complete) => {
      store.add(saved)
      complete(saved)
    })
  },
  rename(workspaceId, id, title) {
    return change(workspaceId, id, (store, current) => {
      const saved = { ...current, title, updatedAt: new Date().toISOString() }
      store.put(saved)
      return saved
    })
  },
  duplicate(workspaceId, id) {
    return change(workspaceId, id, (store, current) => {
      const now = new Date().toISOString()
      const copy = {
        ...structuredClone(current),
        id: crypto.randomUUID(),
        title: `${(current.title || 'Untitled CV').slice(0, 113).trimEnd()} (copy)`,
        createdAt: now,
        updatedAt: now
      }
      store.add(copy)
      return copy
    })
  },
  remove(workspaceId, id) {
    return change(workspaceId, id, (store, current) => {
      store.delete(current.id)
      return current.id
    })
  }
}
