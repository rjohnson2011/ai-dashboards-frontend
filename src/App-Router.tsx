import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './Dashboard'
import { AuthCallback } from './components/AuthCallback'

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth callback route */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        
        {/* Default route redirects to vets-api */}
        <Route path="/" element={<Navigate to="/dashboard/vets-api" replace />} />
        
        {/* Dynamic repository routes */}
        <Route path="/dashboard/:repositoryName" element={<Dashboard />} />
        
        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/dashboard/vets-api" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter