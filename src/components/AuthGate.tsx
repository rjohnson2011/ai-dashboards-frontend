import { useState, useEffect, type ReactNode } from 'react'
import { authService } from '../services/auth'
import Login from './Login'

interface Props {
  children: ReactNode
}

export default function AuthGate({ children }: Props) {
  const [authed, setAuthed] = useState(authService.isAuthenticated())

  useEffect(() => {
    // Re-check auth state when the tab regains focus (covers token expiry).
    const onFocus = () => setAuthed(authService.isAuthenticated())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  if (!authed) {
    return <Login />
  }

  return <>{children}</>
}
