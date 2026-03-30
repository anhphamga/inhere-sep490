import {
  createVoucherRequest,
  getMyVouchersRequest,
  getVoucherDetailRequest,
  getVouchersRequest,
  toggleVoucherStatusRequest,
  updateVoucherRequest,
  validateVoucherRequest,
} from '../api/voucher.api'

export const getMyVouchersApi = async (params = {}) => {
  const response = await getMyVouchersRequest(params)
  return response.data
}

export const getVouchersApi = async (params = {}) => {
  const response = await getVouchersRequest(params)
  return response.data
}

export const getVoucherDetailApi = async (voucherId) => {
  const response = await getVoucherDetailRequest(voucherId)
  return response.data
}

export const createVoucherApi = async (payload) => {
  const response = await createVoucherRequest(payload)
  return response.data
}

export const updateVoucherApi = async (voucherId, payload) => {
  const response = await updateVoucherRequest(voucherId, payload)
  return response.data
}

export const toggleVoucherStatusApi = async (voucherId) => {
  const response = await toggleVoucherStatusRequest(voucherId)
  return response.data
}

export const validateVoucherApi = async (payload) => {
  const response = await validateVoucherRequest(payload)
  return response.data
}
