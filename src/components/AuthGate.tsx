import { useState, useEffect, type ReactNode } from 'react'
import { authService } from '../services/auth'
import Login from './Login'

interface Props {
  children: ReactNode
}

const SKIP_AUTH = import.meta.env.VITE_USE_MOCK_DATA === 'true'

export default function AuthGate({ children }: Props) {
  const [authed, setAuthed] = useState(SKIP_AUTH || authService.isAuthenticated())

  useEffect(() => {
    // Re-check auth state when the tab regains focus (covers token expiry).
    const onFocus = () => setAuthed(authService.isAuthenticated())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  if (!SKIP_AUTH && !authed) {
    return <Login />
  }

  return <>{children}</>
}
