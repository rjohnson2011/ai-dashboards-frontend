import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authService } from '../services/auth'

export function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token')
      const error = searchParams.get('message')

      if (error) {
        console.error('Authentication error:', error)
        navigate('/?error=auth_failed')
        return
      }

      if (!token) {
        console.error('No token received')
        navigate('/?error=no_token')
        return
      }

      try {
        await authService.handleCallback(token)
        navigate('/')
      } catch (err) {
        console.error('Failed to handle auth callback:', err)
        navigate('/?error=callback_failed')
      }
    }

    handleCallback()
  }, [navigate, searchParams])

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2>Authenticating...</h2>
        <p>Please wait while we complete your login.</p>
      </div>
    </div>
  )
}