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

export const signupApi = async (payload) => {
  const response = await signupRequest(payload)
  return response.data
}

export const loginApi = async (payload) => {
  const response = await loginRequest(payload)
  return response.data
}

export const googleLoginApi = async (payload) => {
  const response = await googleLoginRequest(payload)
  return response.data
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
