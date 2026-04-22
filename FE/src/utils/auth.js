import { API_BASE_URL } from '../config/env'

export const normalizeRole = (role) => String(role || '').trim().toLowerCase()

export const isDashboardRole = (role) => {
  const normalizedRole = normalizeRole(role)
  return normalizedRole === 'owner' || normalizedRole === 'staff'
}

export const getRouteByRole = (role) => {
  const normalizedRole = normalizeRole(role)

  if (normalizedRole === 'owner') {
    return '/owner/dashboard'
  }

  if (normalizedRole === 'staff') {
    return '/staff'
  }

  return '/'
}

/**
 * ✅ PRODUCTION-SAFE: Redirect to Google OAuth login endpoint
 * Uses API_BASE_URL to ensure correct origin (prevents origin_mismatch error)
 * 
 * Before: ❌ window.location.href = "/api/auth/google"
 * After:  ✅ window.location.href = `${API_BASE_URL}/auth/google`
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.portal - Portal type: 'customer', 'owner', 'staff'
 * @example
 * redirectToGoogleLogin({ portal: 'customer' })
 */
export const redirectToGoogleLogin = (options = {}) => {
  const { portal = 'customer' } = options
  const googleAuthUrl = `${API_BASE_URL}/auth/google?portal=${portal}`

  console.log('🔐 [OAuth] Redirecting to Google login:', {
    targetUrl: googleAuthUrl,
    portal,
    apiBaseUrl: API_BASE_URL,
    timestamp: new Date().toISOString()
  })

  window.location.href = googleAuthUrl
}
