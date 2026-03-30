import axiosClient from '../config/axios'

export const getMyVouchersRequest = (params = {}) => {
  return axiosClient.get('/vouchers/my', { params })
}

export const getVouchersRequest = (params = {}) => {
  return axiosClient.get('/vouchers', { params })
}

export const getVoucherDetailRequest = (voucherId) => {
  return axiosClient.get(`/vouchers/${voucherId}`)
}

export const createVoucherRequest = (payload) => {
  return axiosClient.post('/vouchers', payload)
}

export const updateVoucherRequest = (voucherId, payload) => {
  return axiosClient.put(`/vouchers/${voucherId}`, payload)
}

export const toggleVoucherStatusRequest = (voucherId) => {
  return axiosClient.patch(`/vouchers/${voucherId}/toggle-status`)
}

export const validateVoucherRequest = (payload) => {
  return axiosClient.post('/vouchers/validate', payload)
}
