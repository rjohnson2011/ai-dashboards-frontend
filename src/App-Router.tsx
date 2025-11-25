import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './Dashboard'
import SprintMetrics from './SprintMetrics'
import DetailedSprintMetrics from './DetailedSprintMetrics'
import { AuthCallback } from './components/AuthCallback'
import { ThemeProvider } from './contexts/ThemeContext'

function AppRouter() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth callback route */}
          <Route path="/auth/callback" element={<AuthCallback />} />

          {/* Default route redirects to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard route */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* Sprint Metrics routes */}
          <Route path="/sprint-metrics" element={<SprintMetrics />} />
          <Route path="/sprint-metrics/detailed" element={<DetailedSprintMetrics />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default AppRouter