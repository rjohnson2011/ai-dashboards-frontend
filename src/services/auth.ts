// Auth service.
//
// Two token types live here:
//
// - API session token (preferred): a long-lived (1y) JWT minted by our
//   API after a successful Google login. Prefixed with "pcr_" and stored
//   under SESSION_TOKEN_KEY. We trust this until the API tells us it's
//   bad.
// - Google ID token (legacy fallback): the raw Google JWT. Stored under
//   the original key so existing browsers don't get logged out at the
//   moment we ship this. Expires after 1 hour, hence the original
//   re-login annoyance.
//
// On every getToken() call we prefer the API session token. If only a
// legacy Google token is present, we'll still return it (the backend
// supports both), but new logins go straight to API tokens.
//
// We deliberately do NOT validate exp client-side anymore — the API
// is the source of truth. If the token is rejected, we'll clear it on a
// 401 response (handled in the data-fetching layer).
const SESSION_TOKEN_KEY = 'api_session_token'
const LEGACY_TOKEN_KEY = 'google_id_token'
const USE_MOCK = import.meta.env.VITE_USE_MOCK_DATA === 'true'

const MOCK_USER: GoogleJwtPayload = {
  email: 'ryan@oddball.io',
  name: 'Ryan Johnson',
  picture: undefined,
  exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365,
}

interface GoogleJwtPayload {
  email: string
  name?: string
  picture?: string
  exp: number
  hd?: string
}

function decodeJwt(token: string): GoogleJwtPayload | null {
  try {
    // For API session tokens, strip the "pcr_" prefix before decoding.
    const raw = token.startsWith('pcr_') ? token.slice(4) : token
    const [, payload] = raw.split('.')
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

class AuthService {
  // Returns whichever token is present, preferring our API session token.
  getToken(): string | null {
    if (USE_MOCK) return 'mock-token'
    return (
      localStorage.getItem(SESSION_TOKEN_KEY) ||
      localStorage.getItem(LEGACY_TOKEN_KEY) ||
      null
    )
  }

  // Store an API session token (long-lived). Use this after exchanging
  // a Google ID token at /api/v1/auth/session.
  setSessionToken(token: string): void {
    localStorage.setItem(SESSION_TOKEN_KEY, token)
    // Drop the short-lived Google token now that we have a long one.
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  }

  // Legacy: store a raw Google ID token. Kept so the old code path still
  // compiles, but should not be called by new login flow.
  setToken(token: string): void {
    localStorage.setItem(LEGACY_TOKEN_KEY, token)
  }

  getUser(): GoogleJwtPayload | null {
    if (USE_MOCK) return MOCK_USER
    const token = this.getToken()
    return token ? decodeJwt(token) : null
  }

  isAuthenticated(): boolean {
    return USE_MOCK || this.getToken() !== null
  }

  clear(): void {
    localStorage.removeItem(SESSION_TOKEN_KEY)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  }

  logout(): void {
    this.clear()
    window.location.href = '/'
  }

  getAuthHeaders(): Record<string, string> {
    const token = this.getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
}

export const authService = new AuthService()
export type { GoogleJwtPayload }
