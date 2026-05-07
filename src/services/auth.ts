// Google ID token auth — stores the JWT in localStorage and supplies it
// as a Bearer token on API requests. The backend verifies the token's
// signature and the email domain whitelist on every request.

const TOKEN_KEY = 'google_id_token'
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
    const [, payload] = token.split('.')
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return null
  }
}

class AuthService {
  getToken(): string | null {
    if (USE_MOCK) return 'mock-token'
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return null
    const payload = decodeJwt(token)
    if (!payload) {
      this.clear()
      return null
    }
    if (Date.now() / 1000 > payload.exp) {
      this.clear()
      return null
    }
    return token
  }

  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token)
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
    localStorage.removeItem(TOKEN_KEY)
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
