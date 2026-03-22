import axiosClient from '../config/axios'

export const sendPhoneOtpRequest = (payload) => axiosClient.post('/guest/send-phone-otp', payload)
export const verifyPhoneOtpRequest = (payload) => axiosClient.post('/guest/verify-phone-otp', payload)
export const sendEmailCodeRequest = (payload) => axiosClient.post('/guest/send-email-code', payload)
export const verifyEmailCodeRequest = (payload) => axiosClient.post('/guest/verify-email-code', payload)
