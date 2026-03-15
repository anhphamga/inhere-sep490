import {
  cancelRentOrderRequest,
  completeRentOrderRequest,
  completeWashingRequest,
  confirmPickupRequest,
  confirmRentOrderRequest,
  confirmReturnRequest,
  createRentOrderRequest,
  finalizeRentOrderRequest,
  getAllRentOrdersRequest,
  getMyRentOrdersRequest,
  getRentOrderByIdRequest,
  markNoShowRequest,
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

export const confirmPickupApi = async (id, payload = {}) => {
  const response = await confirmPickupRequest(id, payload)
  return response.data
}

export const confirmReturnApi = async (id, payload = {}) => {
  const response = await confirmReturnRequest(id, payload)
  return response.data
}

export const markNoShowApi = async (id) => {
  const response = await markNoShowRequest(id)
  return response.data
}

export const completeWashingApi = async (orderId, payload = {}) => {
  const response = await completeWashingRequest(orderId, payload)
  return response.data
}

export const finalizeRentOrderApi = async (id, payload = {}) => {
  const response = await finalizeRentOrderRequest(id, payload)
  return response.data
}

export const completeRentOrderApi = async (id, payload = {}) => {
  const response = await completeRentOrderRequest(id, payload)
  return response.data
}
