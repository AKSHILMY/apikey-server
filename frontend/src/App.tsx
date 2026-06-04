import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Organizations from './pages/Organizations'
import Products from './pages/Products'
import Projects from './pages/Projects'
import Keys from './pages/Keys'
import Settings from './pages/Settings'
import LoginPage from './pages/LoginPage'

function ProtectedRoutes() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return (
    <Layout>
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="orgs" element={<Organizations />} />
        <Route path="products" element={<Products />} />
        <Route path="projects" element={<Projects />} />
        <Route path="keys" element={<Keys />} />
        <Route path="settings" element={<Settings />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
