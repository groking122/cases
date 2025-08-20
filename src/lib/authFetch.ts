export function authFetch(input: RequestInfo, init: RequestInit = {}) {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('userToken') : null
    const headers = new Headers(init.headers || {})
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return fetch(input, { ...init, headers })
  } catch {
    return fetch(input, init)
  }
}


