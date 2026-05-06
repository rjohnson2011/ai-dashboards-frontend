import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import Dashboard from './Dashboard'
import SprintMetrics from './SprintMetrics'
import DetailedSprintMetrics from './DetailedSprintMetrics'
import AuthGate from './components/AuthGate'
import { ThemeProvider } from './contexts/ThemeContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

function AppRouter() {
  if (!GOOGLE_CLIENT_ID) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-xl font-medium">Configuration error</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            VITE_GOOGLE_CLIENT_ID is not set. The dashboard cannot start.
          </p>
        </div>
      </div>
    )
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <BrowserRouter>
          <AuthGate>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/sprint-metrics" element={<SprintMetrics />} />
              <Route path="/sprint-metrics/detailed" element={<DetailedSprintMetrics />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthGate>
        </BrowserRouter>
      </ThemeProvider>
    </GoogleOAuthProvider>
  )
}

export default AppRouter