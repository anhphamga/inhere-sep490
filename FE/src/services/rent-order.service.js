import {
  cancelRentOrderRequest,
  completeWashingRequest,
  confirmPickupRequest,
  confirmRentOrderRequest,
  confirmReturnRequest,
  createRentOrderRequest,
  getAllRentOrdersRequest,
  getMyRentOrdersRequest,
  getRentOrderByIdRequest,
  payDepositRequest
} from '../api/rent-order.api'

export const createRentOrderApi = async (payload) => {
  const response = await createRentOrderRequest(payload)
  return response.data
}

export const getMyRentOrdersApi = async (params = {}) => {
  const response = await getMyRentOrdersRequest(params)
  return response.data
}

export const getRentOrderByIdApi = async (id) => {
  const response = await getRentOrderByIdRequest(id)
  return response.data
}

export const payDepositApi = async (id, payload = {}) => {
  const response = await payDepositRequest(id, payload)
  return response.data
}

export const cancelRentOrderApi = async (id) => {
  const response = await cancelRentOrderRequest(id)
  return response.data
}

export const getAllRentOrdersApi = async (params = {}) => {
  const response = await getAllRentOrdersRequest(params)
  return response.data
}

export const confirmRentOrderApi = async (id) => {
  const response = await confirmRentOrderRequest(id)
  return response.data
}

export const confirmPickupApi = async (id) => {
  const response = await confirmPickupRequest(id)
  return response.data
}

export const confirmReturnApi = async (id, payload = {}) => {
  const response = await confirmReturnRequest(id, payload)
  return response.data
}

export const completeWashingApi = async (orderId, payload = {}) => {
  const response = await completeWashingRequest(orderId, payload)
  return response.data
}
