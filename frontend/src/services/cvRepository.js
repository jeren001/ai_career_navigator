const databaseName = 'ai-career-cvs'
const storeName = 'cvs'

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run(mode, action) {
  const db = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode)
      const request = action(transaction.objectStore(storeName))
      transaction.oncomplete = () => resolve(request.result)
      transaction.onabort = () => reject(transaction.error ?? new Error('CV transaction was aborted.'))
      transaction.onerror = () => reject(transaction.error ?? request.error)
    })
  } finally {
    db.close()
  }
}

// The UI uses this async interface so a backend can replace browser storage.
export const cvRepository = {
  list: () => run('readonly', store => store.getAll()),
  async save(record) {
    await run('readwrite', store => store.put(record))
    return record
  }
}
