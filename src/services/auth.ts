// Google ID token auth — stores the JWT in localStorage and supplies it
// as a Bearer token on API requests. The backend verifies the token's
// signature and the email domain whitelist on every request.

const TOKEN_KEY = 'google_id_token'

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
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) return null
    const payload = decodeJwt(token)
    if (!payload) {
      this.clear()
      return null
    }
    // exp is seconds since epoch
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
    const token = this.getToken()
    return token ? decodeJwt(token) : null
  }

  isAuthenticated(): boolean {
    return this.getToken() !== null
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
