import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getMeApi, googleLoginApi, loginApi, logoutApi, signupApi } from '../services/auth.service'
import { setAuthToken } from '../config/axios'

const AuthContext = createContext(null)

const TOKEN_KEY = 'inhere_token'
const USER_KEY = 'inhere_user'

const getStoredAuth = () => {
    const localToken = localStorage.getItem(TOKEN_KEY)
    const localUser = localStorage.getItem(USER_KEY)

    if (localToken && localUser) {
        return {
            token: localToken,
            user: JSON.parse(localUser),
            storage: 'local'
        }
    }

    const sessionToken = sessionStorage.getItem(TOKEN_KEY)
    const sessionUser = sessionStorage.getItem(USER_KEY)

    if (sessionToken && sessionUser) {
        return {
            token: sessionToken,
            user: JSON.parse(sessionUser),
            storage: 'session'
        }
    }

    return {
        token: null,
        user: null,
        storage: 'local'
    }
}

export const AuthProvider = ({ children }) => {
    const initialAuth = getStoredAuth()
    const [token, setToken] = useState(initialAuth.token)
    const [user, setUser] = useState(initialAuth.user)
    const [loading, setLoading] = useState(true)
    const [storageMode, setStorageMode] = useState(initialAuth.storage)

    const persistSession = useCallback((nextToken, nextUser, options = {}) => {
        const rememberMe = options.rememberMe ?? true
        const targetStorage = rememberMe ? localStorage : sessionStorage
        const fallbackStorage = rememberMe ? sessionStorage : localStorage

        setToken(nextToken)
        setUser(nextUser)
        setStorageMode(rememberMe ? 'local' : 'session')

        fallbackStorage.removeItem(TOKEN_KEY)
        fallbackStorage.removeItem(USER_KEY)

        if (nextToken) {
            targetStorage.setItem(TOKEN_KEY, nextToken)
            setAuthToken(nextToken)
        } else {
            targetStorage.removeItem(TOKEN_KEY)
            setAuthToken(null)
        }

        if (nextUser) {
            targetStorage.setItem(USER_KEY, JSON.stringify(nextUser))
        } else {
            targetStorage.removeItem(USER_KEY)
        }
    }, [])

    const clearSession = useCallback(() => {
        localStorage.removeItem(TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        sessionStorage.removeItem(TOKEN_KEY)
        sessionStorage.removeItem(USER_KEY)
        setStorageMode('local')
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
                persistSession(token, response.data, { rememberMe: storageMode !== 'session' })
            } catch {
                clearSession()
            } finally {
                setLoading(false)
            }
        }

        initialize()
    }, [clearSession, persistSession, storageMode, token])

    const login = useCallback(async (payload, options = {}) => {
        const response = await loginApi(payload)
        persistSession(response.data.token, response.data.user, {
            rememberMe: options.rememberMe ?? true
        })
        return response.data
    }, [persistSession])

    const loginWithGoogle = useCallback(async (payload, options = {}) => {
        const response = await googleLoginApi(payload)
        persistSession(response.data.token, response.data.user, {
            rememberMe: options.rememberMe ?? true
        })
        return response.data
    }, [persistSession])

    const signup = useCallback(async (payload) => {
        const response = await signupApi(payload)
        persistSession(response.data.token, response.data.user, { rememberMe: true })
        return response.data
    }, [persistSession])

    const logout = useCallback(async () => {
        try {
            await logoutApi()
        } catch {
            // ignore logout API errors and always clear local session
        } finally {
            clearSession()
        }
    }, [clearSession])

    const refreshMe = useCallback(async () => {
        if (!token) {
            return null
        }

        const response = await getMeApi()
        persistSession(token, response.data, { rememberMe: storageMode !== 'session' })
        return response.data
    }, [persistSession, storageMode, token])

    const value = useMemo(() => ({
        token,
        user,
        loading,
        isAuthenticated: Boolean(token && user),
        login,
        loginWithGoogle,
        signup,
        logout,
        refreshMe,
        clearSession
    }), [token, user, loading, login, loginWithGoogle, signup, logout, refreshMe, clearSession])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider')
    }

    return context
}
