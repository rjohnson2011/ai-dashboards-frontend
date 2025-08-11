const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface User {
  id: number
  github_username: string
  name: string
  email: string
  avatar_url: string
  is_va_member: boolean
  last_login_at: string
}

class AuthService {
  private token: string | null = null
  private user: User | null = null

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('auth_token')
  }

  // Start GitHub OAuth flow
  login() {
    window.location.href = `${API_BASE_URL}/api/v1/auth/github`
  }

  // Handle OAuth callback
  async handleCallback(token: string): Promise<User> {
    this.token = token
    localStorage.setItem('auth_token', token)
    
    // Fetch user data
    const user = await this.fetchCurrentUser()
    this.user = user
    
    return user
  }

  // Get current user
  async fetchCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user')
    }

    const user = await response.json()
    this.user = user
    return user
  }

  // Logout
  logout() {
    this.token = null
    this.user = null
    localStorage.removeItem('auth_token')
    
    // Call logout endpoint (optional, since we're using JWT)
    fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    }).catch(() => {
      // Ignore errors, we're logging out anyway
    })
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.token
  }

  // Check if user is VA member
  isVAMember(): boolean {
    return this.user?.is_va_member || false
  }

  // Get auth headers for API requests
  getAuthHeaders(): HeadersInit {
    if (!this.token) {
      return {}
    }

    return {
      'Authorization': `Bearer ${this.token}`
    }
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.user
  }

  // Get token
  getToken(): string | null {
    return this.token
  }
}

// Export singleton instance
export const authService = new AuthService()
export type { User }