import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './Dashboard'

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
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