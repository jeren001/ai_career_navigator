import { readStoredInterviewEvaluation } from './interviewEvaluationProvider.js'
import {
  applySessionAction, assertCurrentSessionAction, createSession, expireSession, validSessionConfiguration, validStoredSession
} from './interviewSessionModel.js'
import {
  defaultInterviewWorkspace, getInterviewWorkspace, legacySessionKey, legacyWorkspaceKey, openInterviewDatabase, requestResult, withSessionStore
} from './interviewSessionDatabase.js'

function legacyData(getStorage, workspace) {
  try {
    const storage = getStorage()
    const raw = storage.getItem(legacySessionKey)
    if (!raw) return null
    const owner = storage.getItem(legacyWorkspaceKey)
    if ((owner ?? defaultInterviewWorkspace) !== workspace) return null
    storage.setItem(legacyWorkspaceKey, workspace)
    const { records } = JSON.parse(raw)
    if (!records || typeof records !== 'object' || Array.isArray(records)) return null
    const entries = Object.entries(records)
    const valid = entries.filter(([id, session]) => validStoredSession(session, id))
    return { raw, records: valid.map(([, session]) => session), complete: valid.length === entries.length }
  } catch {
    return null
  }
}

function forgetLegacyRecords(getStorage, workspace, ids) {
  try {
    const storage = getStorage()
    if (storage.getItem(legacyWorkspaceKey) !== workspace) return
    const data = JSON.parse(storage.getItem(legacySessionKey))
    if (!data?.records || typeof data.records !== 'object' || Array.isArray(data.records)) return
    for (const id of ids) delete data.records[id]
    if (ids.includes(data.activeId)) data.activeId = null
    if (Object.keys(data.records).length) storage.setItem(legacySessionKey, JSON.stringify(data))
    else {
      storage.removeItem(legacySessionKey)
      storage.removeItem(legacyWorkspaceKey)
    }
  } catch {
    // A committed tombstone still prevents this copy from being shown or restored.
  }
}

export function createInterviewSessionRepository({
  openDatabase = openInterviewDatabase,
  getWorkspace = getInterviewWorkspace,
  getLegacyStorage = () => sessionStorage,
  now = () => Date.now(),
  makeId = () => crypto.randomUUID()
} = {}) {
  let pending = Promise.resolve()

  async function run(action) {
    const workspace = getWorkspace()
    const operation = pending.then(() => transact(action, workspace))
    pending = operation.catch(() => {})
    return operation
  }

  async function transact(action, workspace) {
    if (!workspace) throw new Error('The interview workspace is unavailable.')
    if (getWorkspace() !== workspace) throw new Error('The interview workspace changed.')
    const legacy = legacyData(getLegacyStorage, workspace)
    const database = await openDatabase()
    try {
      if (getWorkspace() !== workspace) throw new Error('The interview workspace changed.')
      if (legacy) {
        const migration = await withSessionStore(database, async store => {
          let allMatched = true
          const deletedIds = []
          for (const session of legacy.records) {
            const existing = await requestResult(store.get([workspace, session.id]))
            if (existing?.deleted) {
              deletedIds.push(session.id)
              continue
            }
            if (!validStoredSession(existing?.session, session.id)) {
              await put(store, workspace, session)
            } else if (JSON.stringify(existing.session) !== JSON.stringify(session)) {
              allMatched = false
            }
          }
          return { allMatched, deletedIds }
        })
        try {
          const storage = getLegacyStorage()
          if (getWorkspace() === workspace && storage.getItem(legacySessionKey) === legacy.raw) {
            if (legacy.complete && migration.allMatched) {
              storage.removeItem(legacySessionKey)
              storage.removeItem(legacyWorkspaceKey)
            } else if (migration.deletedIds.length) {
              forgetLegacyRecords(getLegacyStorage, workspace, migration.deletedIds)
            }
          }
        } catch {
          // A committed migration can be safely retried when the legacy copy remains.
        }
      }
      const result = await withSessionStore(database, store => {
        if (getWorkspace() !== workspace) throw new Error('The interview workspace changed.')
        return action(store, workspace)
      })
      if (getWorkspace() !== workspace) throw new Error('The interview workspace changed.')
      return result
    } finally {
      database.close()
    }
  }

  async function put(store, workspace, session) {
    await requestResult(store.put({ workspace, id: session.id, session }))
  }

  async function lookup(store, workspace, id) {
    const record = await requestResult(store.get([workspace, id]))
    return validStoredSession(record?.session, id) ? record.session : null
  }

  async function reconcile(store, workspace, session, time) {
    if (!session) return null
    const current = expireSession(session, time)
    if (current !== session) await put(store, workspace, current)
    return current
  }

  async function rows(store, workspace) {
    const stored = await requestResult(store.index('byWorkspace').getAll(workspace))
    return stored.filter(({ id, session, deleted }) => !deleted && validStoredSession(session, id))
      .sort((left, right) => right.session.createdAt - left.session.createdAt || right.id.localeCompare(left.id))
  }

  async function unfinished(store, workspace, time) {
    const candidates = (await rows(store, workspace))
      .map(({ session }) => session).filter(session => session.status !== 'completed')
    for (const candidate of candidates) {
      const session = await reconcile(store, workspace, candidate, time)
      if (session.status !== 'completed') return session
    }
    return null
  }

  async function removeRow(store, workspace, id) {
    // Remember just the deleted ID so a legacy tab cannot re-import its content.
    await requestResult(store.put({ workspace, id, deleted: true }))
  }

  async function removeRecords(action) {
    const workspace = getWorkspace()
    const ids = await run(action)
    forgetLegacyRecords(getLegacyStorage, workspace, ids)
    return ids
  }

  return {
    async get(id) {
      if (typeof id !== 'string' || !id) return null
      return run(async (store, workspace) => reconcile(store, workspace, await lookup(store, workspace, id), now()))
    },
    async getWithEvaluation(id) {
      if (typeof id !== 'string' || !id) return null
      return run(async (store, workspace) => {
        const row = await requestResult(store.get([workspace, id]))
        if (!validStoredSession(row?.session, id)) return null
        const session = await reconcile(store, workspace, row.session, now())
        return { session, evaluation: readStoredInterviewEvaluation(row.evaluation, session) }
      })
    },
    async list() {
      return run(async (store, workspace) => {
        const time = now()
        const records = []
        for (const row of await rows(store, workspace)) {
          const session = await reconcile(store, workspace, row.session, time)
          const evaluation = readStoredInterviewEvaluation(row.evaluation, session)
          records.push({ session, evaluation })
        }
        return records
      })
    },
    async getEvaluation(id) {
      return run(async (store, workspace) => {
        const row = await requestResult(store.get([workspace, id]))
        if (!validStoredSession(row?.session, id) || row.session.status !== 'completed') return null
        return readStoredInterviewEvaluation(row.evaluation, row.session)
      })
    },
    async saveEvaluation(id, response) {
      return run(async (store, workspace) => {
        const row = await requestResult(store.get([workspace, id]))
        if (!validStoredSession(row?.session, id) || row.session.status !== 'completed') {
          throw new Error('The completed interview is unavailable.')
        }
        const previous = readStoredInterviewEvaluation(row.evaluation, row.session)
        if (previous.status === 'completed') return previous
        const evaluation = readStoredInterviewEvaluation(response, row.session)
        if (evaluation.status !== 'unavailable') {
          await requestResult(store.put({ ...row, evaluation }))
        }
        return evaluation
      })
    },
    async remove(id, { includeUnfinished = false } = {}) {
      return removeRecords(async (store, workspace) => {
        const session = await reconcile(store, workspace, await lookup(store, workspace, id), now())
        if (!session) throw new Error('This interview is no longer available.')
        if (session.status !== 'completed' && !includeUnfinished) {
          throw new Error('Confirm deletion of this unfinished interview first.')
        }
        await removeRow(store, workspace, id)
        return [id]
      })
    },
    async removeAll({ includeUnfinished = false, expectedIds } = {}) {
      return removeRecords(async (store, workspace) => {
        const time = now()
        const ids = []
        for (const row of await rows(store, workspace)) {
          const session = await reconcile(store, workspace, row.session, time)
          if (includeUnfinished || session.status === 'completed') ids.push(session.id)
        }
        if (expectedIds && (expectedIds.length !== ids.length || ids.some(id => !expectedIds.includes(id)))) {
          throw new Error('Interview history changed. Refresh the list and confirm again.')
        }
        for (const id of ids) await removeRow(store, workspace, id)
        return ids
      })
    },
    async getUnfinished() {
      return run((store, workspace) => unfinished(store, workspace, now()))
    },
    async start(configuration, { replaceId } = {}) {
      if (!validSessionConfiguration(configuration)) throw new Error('Invalid interview configuration.')
      return run(async (store, workspace) => {
        const time = now()
        const active = await unfinished(store, workspace, time)
        if (active) {
          if (active.id !== replaceId) return { conflict: active }
          await put(store, workspace, applySessionAction(active, { type: 'end' }, time))
        }
        const session = createSession(makeId(), configuration, time)
        await requestResult(store.add({ workspace, id: session.id, session }))
        return { session }
      })
    },
    async update(id, action) {
      return run(async (store, workspace) => {
        const session = await lookup(store, workspace, id)
        if (!session) throw new Error('The interview session is unavailable.')
        assertCurrentSessionAction(session, action)
        const updated = applySessionAction(session, action, now())
        if (updated !== session) await put(store, workspace, updated)
        return updated
      })
    }
  }
}

export const interviewSessionRepository = createInterviewSessionRepository()

export function interviewSessionPath(id) {
  return `/interview-simulator/session?id=${encodeURIComponent(id)}`
}

export function interviewResultsPath(id) {
  return `/interview-simulator/results/${encodeURIComponent(id)}`
}
