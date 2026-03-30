import axios from 'axios'

export const ACCESS_TOKEN_KEY = 'accessToken'
export const REFRESH_TOKEN_KEY = 'refreshToken'

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000/api',
    headers: {
        'Content-Type': 'application/json'
    }
})

const refreshClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000/api',
    headers: {
        'Content-Type': 'application/json'
    }
})

const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY)
const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY)

const redirectToLogin = () => {
    const path = window.location.pathname || ''
    const target = path.startsWith('/owner')
        ? '/work/login?role=owner'
        : path.startsWith('/staff')
            ? '/work/login?role=staff'
            : '/login'
    if (path !== target) {
        window.location.href = target
    }
}

const clearAuthStorage = () => {
    localStorage.clear()
    sessionStorage.clear()
}

export const setAuthToken = (token) => {
    if (token) {
        axiosClient.defaults.headers.common.Authorization = `Bearer ${token}`
        return
    }

    delete axiosClient.defaults.headers.common.Authorization
}

axiosClient.interceptors.request.use((config) => {
    const token = getAccessToken()

    if (token) {
        config.headers = config.headers || {}
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
})

let refreshPromise = null

axiosClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config
        const status = error?.response?.status
        const requestUrl = originalRequest?.url || ''

        if (status !== 401 || !originalRequest || originalRequest._retry) {
            return Promise.reject(error)
        }

        const isAuthEndpoint = requestUrl.includes('/auth/login')
            || requestUrl.includes('/auth/google-login')
            || requestUrl.includes('/auth/refresh')

        if (isAuthEndpoint) {
            return Promise.reject(error)
        }

        const refreshToken = getRefreshToken()
        if (!refreshToken) {
            clearAuthStorage()
            redirectToLogin()
            return Promise.reject(error)
        }

        originalRequest._retry = true

        try {
            if (!refreshPromise) {
                refreshPromise = refreshClient
                    .post('/auth/refresh', { refreshToken })
                    .then((response) => response.data?.data?.accessToken)
                    .finally(() => {
                        refreshPromise = null
                    })
            }

            const newAccessToken = await refreshPromise

            if (!newAccessToken) {
                throw new Error('Cannot refresh access token')
            }

            localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken)
            setAuthToken(newAccessToken)

            originalRequest.headers = originalRequest.headers || {}
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

            return axiosClient(originalRequest)
        } catch (refreshError) {
            clearAuthStorage()
            redirectToLogin()
            return Promise.reject(refreshError)
        }
    }
)

export default axiosClient
