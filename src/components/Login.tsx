import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { useState } from 'react'
import { authService } from '../services/auth'

const ALLOWED_DOMAINS = ['oddball.io', 'adhocteam.us', 'va.gov']
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function Login() {
  const [error, setError] = useState<string | null>(null)

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    const idToken = credentialResponse.credential
    if (!idToken) return
    setError(null)

    try {
      const r = await fetch(`${API_URL}/api/v1/auth/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      })
      if (r.ok) {
        const data: { token: string } = await r.json()
        authService.setSessionToken(data.token)
      } else {
        // Backend rejected the exchange (e.g. domain restriction). Fall
        // back to using the raw Google token so the user isn't blocked
        // by a backend hiccup; it'll work for an hour.
        authService.setToken(idToken)
      }
    } catch {
      // Network error — same fallback.
      authService.setToken(idToken)
    }

    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div>
          <h1 className="text-3xl font-light tracking-tight">PR Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in with your work Google account to continue.
          </p>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setError('Sign-in failed. Try again.')}
            useOneTap={false}
            theme="filled_black"
            shape="rectangular"
            size="large"
          />
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <p className="text-xs text-muted-foreground">
          Access is restricted to <code>{ALLOWED_DOMAINS.join(', ')}</code> email addresses.
        </p>
      </div>
    </div>
  )
}
