import { createContext, useContext, useState, useEffect } from 'react'
import { login as apiLogin, logout as apiLogout, getMe } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const res = await getMe()
      if (res && res.user) {
        setUser(res.user)
      } else {
        setUser(null)
      }
    } catch (e) {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const res = await apiLogin(email, password)
    if (res && res.user) {
      setUser(res.user)
      return res.user
    }
    throw new Error('登录失败')
  }

  const logout = async () => {
    try {
      await apiLogout()
    } catch (e) {
      console.error('Logout error:', e)
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
