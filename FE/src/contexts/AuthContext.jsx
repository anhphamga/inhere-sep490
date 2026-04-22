import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getMeApi, googleLoginApi, loginApi, logoutApi, signupApi } from '../services/auth.service'
import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, setAuthToken } from '../config/axios'

const AuthContext = createContext(null)

const USER_KEY = 'inhere_user'

const getStoredAuth = () => {
    const localToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    const localRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    const localUser = localStorage.getItem(USER_KEY)

    if (localToken && localRefreshToken && localUser) {
        return {
            token: localToken,
            refreshToken: localRefreshToken,
            user: JSON.parse(localUser),
            storage: 'local'
        }
    }

    const sessionToken = sessionStorage.getItem(ACCESS_TOKEN_KEY)
    const sessionUser = sessionStorage.getItem(USER_KEY)

    if (sessionToken && localRefreshToken && sessionUser) {
        return {
            token: sessionToken,
            refreshToken: localRefreshToken,
            user: JSON.parse(sessionUser),
            storage: 'session'
        }
    }

    return {
        token: null,
        refreshToken: null,
        user: null,
        storage: 'local'
    }
}

export const AuthProvider = ({ children }) => {
    const initialAuth = getStoredAuth()
    const [token, setToken] = useState(initialAuth.token)
    const [refreshToken, setRefreshToken] = useState(initialAuth.refreshToken)
    const [user, setUser] = useState(initialAuth.user)
    const [loading, setLoading] = useState(true)
    const [storageMode, setStorageMode] = useState(initialAuth.storage)

    const persistSession = useCallback((nextToken, nextRefreshToken, nextUser, options = {}) => {
        const rememberMe = options.rememberMe ?? true
        const targetStorage = rememberMe ? localStorage : sessionStorage
        const fallbackStorage = rememberMe ? sessionStorage : localStorage

        setToken(nextToken)
        setRefreshToken(nextRefreshToken)
        setUser(nextUser)
        setStorageMode(rememberMe ? 'local' : 'session')

        fallbackStorage.removeItem(ACCESS_TOKEN_KEY)
        fallbackStorage.removeItem(USER_KEY)

        if (nextToken) {
            localStorage.setItem(ACCESS_TOKEN_KEY, nextToken)
            if (targetStorage === sessionStorage) {
                targetStorage.setItem(ACCESS_TOKEN_KEY, nextToken)
            }
            setAuthToken(nextToken)
        } else {
            localStorage.removeItem(ACCESS_TOKEN_KEY)
            sessionStorage.removeItem(ACCESS_TOKEN_KEY)
            setAuthToken(null)
        }

        if (nextRefreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken)
        } else {
            localStorage.removeItem(REFRESH_TOKEN_KEY)
        }

        if (nextUser) {
            targetStorage.setItem(USER_KEY, JSON.stringify(nextUser))
        } else {
            targetStorage.removeItem(USER_KEY)
        }
    }, [])

    const clearSession = useCallback(() => {
        localStorage.removeItem(ACCESS_TOKEN_KEY)
        localStorage.removeItem(REFRESH_TOKEN_KEY)
        localStorage.removeItem(USER_KEY)
        sessionStorage.removeItem(ACCESS_TOKEN_KEY)
        sessionStorage.removeItem(USER_KEY)
        setStorageMode('local')
        persistSession(null, null, null)
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
                persistSession(token, refreshToken, response.data, { rememberMe: storageMode !== 'session' })
            } catch {
                clearSession()
            } finally {
                setLoading(false)
            }
        }

        initialize()
    }, [clearSession, persistSession, refreshToken, storageMode, token])

    const login = useCallback(async (payload, options = {}) => {
        const response = await loginApi(payload)
        persistSession(response.data.accessToken, response.data.refreshToken, response.data.user, {
            rememberMe: options.rememberMe ?? true
        })
        return response.data
    }, [persistSession])

    const loginWithGoogle = useCallback(async (payload, options = {}) => {
        try {
            console.log('🔐 [OAuth] Initiating Google login:', {
                portal: payload?.portal,
                hasIdToken: Boolean(payload?.idToken),
                timestamp: new Date().toISOString()
            })
            
            const response = await googleLoginApi(payload)
            
            console.log('🔐 [OAuth] Google login successful:', {
                userId: response.data?.user?.id,
                email: response.data?.user?.email,
                role: response.data?.user?.role,
                timestamp: new Date().toISOString()
            })
            
            persistSession(response.data.accessToken, response.data.refreshToken, response.data.user, {
                rememberMe: options.rememberMe ?? true
            })
            return response.data
        } catch (error) {
            console.error('🔐 [OAuth] Google login failed:', {
                status: error?.response?.status,
                message: error?.response?.data?.message || error?.message,
                url: error?.config?.url,
                timestamp: new Date().toISOString()
            })
            throw error
        }
    }, [persistSession])

    const signup = useCallback(async (payload) => {
        const response = await signupApi(payload)
        persistSession(response.data.accessToken, response.data.refreshToken, response.data.user, { rememberMe: true })
        return response.data
    }, [persistSession])

    const logout = useCallback(async () => {
        try {
            await logoutApi({ refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) })
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
        persistSession(token, refreshToken, response.data, { rememberMe: storageMode !== 'session' })
        return response.data
    }, [persistSession, refreshToken, storageMode, token])

    const value = useMemo(() => ({
        token,
        refreshToken,
        user,
        loading,
        isAuthenticated: Boolean(token && user),
        login,
        loginWithGoogle,
        signup,
        logout,
        refreshMe,
        clearSession
    }), [token, refreshToken, user, loading, login, loginWithGoogle, signup, logout, refreshMe, clearSession])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used inside AuthProvider')
    }

    return context
}
