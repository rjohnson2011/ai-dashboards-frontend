import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import Dashboard from './Dashboard'
import RedesignedDashboard from './RedesignedDashboard'
import ReviewerMetrics from './ReviewerMetrics'
import AuthGate from './components/AuthGate'
import { ThemeProvider } from './contexts/ThemeContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const SKIP_AUTH = import.meta.env.VITE_USE_MOCK_DATA === 'true'

function AppRouter() {
  if (!GOOGLE_CLIENT_ID && !SKIP_AUTH) {
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

  // Wrap children in a no-op provider when running mock-data mode without
  // a Google client ID, so the app boots locally for design iteration.
  const Provider = ({ children }: { children: React.ReactNode }) =>
    GOOGLE_CLIENT_ID ? (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>{children}</GoogleOAuthProvider>
    ) : (
      <>{children}</>
    )

  return (
    <Provider>
      <ThemeProvider>
        <BrowserRouter>
          <AuthGate>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/redesign" element={<RedesignedDashboard />} />
              <Route path="/sprint-metrics" element={<ReviewerMetrics />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthGate>
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  )
}

export default AppRouter