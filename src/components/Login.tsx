import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import { authService } from '../services/auth'

const ALLOWED_DOMAINS = ['oddball.io', 'adhocteam.us', 'va.gov']

export default function Login() {
  const handleSuccess = (credentialResponse: CredentialResponse) => {
    const token = credentialResponse.credential
    if (!token) return
    authService.setToken(token)
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
            onError={() => {
              // No-op: Google's button handles its own UI errors.
            }}
            useOneTap={false}
            theme="filled_black"
            shape="rectangular"
            size="large"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Access is restricted to <code>{ALLOWED_DOMAINS.join(', ')}</code> email addresses.
        </p>
      </div>
    </div>
  )
}
