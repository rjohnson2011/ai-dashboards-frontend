import { type ReactNode, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { authService } from '../services/auth'

interface ProtectedRouteProps {
  children: ReactNode
  requireVAMembership?: boolean
}

export function ProtectedRoute({ children, requireVAMembership = false }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isVAMember, setIsVAMember] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      if (authService.isAuthenticated()) {
        try {
          const user = await authService.fetchCurrentUser()
          setIsAuthenticated(true)
          setIsVAMember(user.is_va_member)
        } catch {
          setIsAuthenticated(false)
        }
      }
      setLoading(false)
    }

    checkAuth()
  }, [])

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  if (requireVAMembership && !isVAMember) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Access Denied</h2>
          <p>You must be a member of the department-of-veterans-affairs organization to access this page.</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}