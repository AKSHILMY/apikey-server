import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { setAdminKey, clearAdminKey, hasAdminKey } from '../lib/api'

interface AuthContextType {
  isAuthenticated: boolean
  login: (key: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(hasAdminKey)

  const login = useCallback((key: string) => {
    setAdminKey(key)
    setIsAuthenticated(true)
  }, [])

  const logout = useCallback(() => {
    clearAdminKey()
    setIsAuthenticated(false)
  }, [])

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
