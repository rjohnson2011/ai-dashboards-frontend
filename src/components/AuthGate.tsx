import { useState, useEffect, type ReactNode } from 'react'
import { authService } from '../services/auth'
import Login from './Login'

interface Props {
  children: ReactNode
}

const SKIP_AUTH = import.meta.env.VITE_USE_MOCK_DATA === 'true'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function AuthGate({ children }: Props) {
  const [authed, setAuthed] = useState(SKIP_AUTH || authService.isAuthenticated())

  useEffect(() => {
    // Re-check auth state when the tab regains focus (covers token expiry).
    const onFocus = () => setAuthed(authService.isAuthenticated())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  // One-time migration: if the user is currently signed in with a legacy
  // Google ID token but doesn't have an API session token yet, exchange
  // it transparently. This way we don't force a re-login on the day this
  // ships — they upgrade silently to the long-lived token.
  useEffect(() => {
    if (SKIP_AUTH) return
    const sessionToken = localStorage.getItem('api_session_token')
    const legacy = localStorage.getItem('google_id_token')
    if (sessionToken || !legacy) return

    fetch(`${API_URL}/api/v1/auth/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: legacy }),
    })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data?.token) {
          authService.setSessionToken(data.token)
        }
      })
      .catch(() => {
        // If the legacy token has already expired, the next API call
        // will 401 and the existing flow will redirect to login.
      })
  }, [])

  if (!SKIP_AUTH && !authed) {
    return <Login />
  }

  return <>{children}</>
}
