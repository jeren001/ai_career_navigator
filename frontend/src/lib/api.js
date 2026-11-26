export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export function createApiClient({
  baseUrl = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000',
  fetchImpl = globalThis.fetch
} = {}) {
  const base = baseUrl.replace(/\/+$/, '')

  return async function request(path, { method = 'GET', body, token, signal, rawBody, responseType = 'json' } = {}) {
    const headers = { Accept: responseType === 'blob' ? 'image/jpeg' : 'application/json' }
    if (rawBody) headers['Content-Type'] = rawBody.type
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    if (token) headers.Authorization = `Bearer ${token}`

    let response
    try {
      response = await fetchImpl(`${base}${path}`, {
        method,
        headers,
        ...(rawBody ? { body: rawBody } : body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal
      })
    } catch (error) {
      if (signal?.aborted || error.name === 'AbortError') throw error
      throw new ApiError(0, 'API network request failed')
    }
    if (response.status === 204) return null

    if (response.ok && responseType === 'blob') return response.blob()

    let data
    try {
      data = await response.json()
    } catch (error) {
      if (signal?.aborted || error.name === 'AbortError') throw error
      throw new ApiError(response.ok ? 502 : response.status, 'API returned a non-JSON response')
    }
    if (!response.ok) throw new ApiError(response.status, data?.error || 'API request failed')
    return data
  }
}

export const api = createApiClient()
