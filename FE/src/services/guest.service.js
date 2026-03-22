import {
  sendEmailCodeRequest,
  sendPhoneOtpRequest,
  verifyEmailCodeRequest,
  verifyPhoneOtpRequest
} from '../api/guest.api'

export const sendPhoneOtpApi = async (payload) => {
  const response = await sendPhoneOtpRequest(payload)
  return response.data
}

export const verifyPhoneOtpApi = async (payload) => {
  const response = await verifyPhoneOtpRequest(payload)
  return response.data
}

export const sendEmailCodeApi = async (payload) => {
  const response = await sendEmailCodeRequest(payload)
  return response.data
}

export const verifyEmailCodeApi = async (payload) => {
  const response = await verifyEmailCodeRequest(payload)
  return response.data
}
