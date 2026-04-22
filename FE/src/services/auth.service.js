import {
  changePasswordRequest,
  forgotPasswordRequest,
  getMeRequest,
  getProfileRequest,
  googleLoginRequest,
  loginRequest,
  logoutRequest,
  refreshRequest,
  resetPasswordRequest,
  signupRequest,
  updateProfileRequest,
  uploadAvatarRequest
} from '../api/auth.api'
import { API_BASE_URL } from '../config/env'

export const signupApi = async (payload) => {
  const response = await signupRequest(payload)
  return response.data
}

export const loginApi = async (payload) => {
  const response = await loginRequest(payload)
  return response.data
}

/**
 * ✅ PRODUCTION-SAFE: Google OAuth login via API
 * Uses API_BASE_URL to ensure correct origin
 * 
 * Logs detailed information for debugging OAuth issues
 * 
 * @param {Object} payload - { idToken, portal }
 * @returns {Promise} User data with tokens
 */
export const googleLoginApi = async (payload) => {
  console.log('🔐 [API] Sending Google idToken to backend:', {
    apiBaseUrl: API_BASE_URL,
    endpoint: '/auth/google-login',
    portal: payload?.portal,
    idTokenLength: payload?.idToken?.length || 0,
    timestamp: new Date().toISOString()
  })
  
  try {
    const response = await googleLoginRequest(payload)
    
    console.log('🔐 [API] Backend accepted Google token:', {
      hasAccessToken: Boolean(response.data?.data?.accessToken),
      hasRefreshToken: Boolean(response.data?.data?.refreshToken),
      hasUser: Boolean(response.data?.data?.user),
      timestamp: new Date().toISOString()
    })
    
    return response.data
  } catch (error) {
    console.error('🔐 [API] Backend rejected Google token:', {
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      message: error?.response?.data?.message || error?.message,
      url: error?.config?.url,
      apiBaseUrl: API_BASE_URL,
      timestamp: new Date().toISOString()
    })
    throw error
  }
}

export const forgotPasswordApi = async (payload) => {
  const response = await forgotPasswordRequest(payload)
  return response.data
}

export const resetPasswordApi = async (payload) => {
  const response = await resetPasswordRequest(payload)
  return response.data
}

export const refreshTokenApi = async (payload) => {
  const response = await refreshRequest(payload)
  return response.data
}

export const logoutApi = async (payload) => {
  const response = await logoutRequest(payload)
  return response.data
}

export const getMeApi = async () => {
  const response = await getMeRequest()
  return response.data
}

export const getProfileApi = async () => {
  const response = await getProfileRequest()
  return response.data
}

export const updateProfileApi = async (payload) => {
  const response = await updateProfileRequest(payload)
  return response.data
}

export const changePasswordApi = async (payload) => {
  const response = await changePasswordRequest(payload)
  return response.data
}

export const uploadAvatarApi = async (file) => {
  const response = await uploadAvatarRequest(file)

  return response.data
}
