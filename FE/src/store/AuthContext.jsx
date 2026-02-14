import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getMeApi, loginApi, logoutApi, signupApi } from '../services/auth.service'
import { setAuthToken } from '../api/axiosClient'

const AuthContext = createContext(null)

const TOKEN_KEY = 'inhere_token'
const USER_KEY = 'inhere_user'

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  })
  const [loading, setLoading] = useState(true)

  const persistSession = useCallback((nextToken, nextUser) => {
    setToken(nextToken)
    setUser(nextUser)

    if (nextToken) {
      localStorage.setItem(TOKEN_KEY, nextToken)
      setAuthToken(nextToken)
    } else {
      localStorage.removeItem(TOKEN_KEY)
      setAuthToken(null)
    }

    if (nextUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  }, [])

  const clearSession = useCallback(() => {
    persistSession(null, null)
  }, [persistSession])

  useEffect(() => {
    if (token) {
      setAuthToken(token)
    }

    const initialize = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const response = await getMeApi()
        persistSession(token, response.data)
      } catch {
        clearSession()
      } finally {
        setLoading(false)
      }
    }

    initialize()
  }, [clearSession, persistSession, token])

  const login = useCallback(async (payload) => {
    const response = await loginApi(payload)
    persistSession(response.data.token, response.data.user)
    return response.data
  }, [persistSession])

  const signup = useCallback(async (payload) => {
    const response = await signupApi(payload)
    persistSession(response.data.token, response.data.user)
    return response.data
  }, [persistSession])

  const logout = useCallback(async () => {
    try {
      await logoutApi()
    } finally {
      clearSession()
    }
  }, [clearSession])

  const refreshMe = useCallback(async () => {
    if (!token) {
      return null
    }

    const response = await getMeApi()
    persistSession(token, response.data)
    return response.data
  }, [persistSession, token])

  const value = useMemo(() => ({
    token,
    user,
    loading,
    isAuthenticated: Boolean(token && user),
    login,
    signup,
    logout,
    refreshMe,
    clearSession
  }), [token, user, loading, login, signup, logout, refreshMe, clearSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }

  return context
}
