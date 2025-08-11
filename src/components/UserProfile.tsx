import { useState, useEffect } from 'react'
import { authService, type User } from '../services/auth'

export function UserProfile() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        if (authService.isAuthenticated()) {
          const userData = await authService.fetchCurrentUser()
          setUser(userData)
        }
      } catch (err) {
        console.error('Failed to load user:', err)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  const handleLogout = () => {
    authService.logout()
    window.location.reload()
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return null
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px',
      backgroundColor: '#f6f8fa',
      borderRadius: '6px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <img
        src={user.avatar_url}
        alt={user.name || user.github_username}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%'
        }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '500', fontSize: '14px' }}>
          {user.name || user.github_username}
        </div>
        {user.is_va_member && (
          <div style={{ fontSize: '12px', color: '#0969da' }}>
            ✓ VA Member
          </div>
        )}
      </div>
      <button
        onClick={handleLogout}
        style={{
          backgroundColor: 'transparent',
          border: '1px solid #d1d5db',
          padding: '4px 12px',
          borderRadius: '6px',
          fontSize: '14px',
          cursor: 'pointer',
          color: '#24292e'
        }}
      >
        Sign out
      </button>
    </div>
  )
}